// notification-service/src/queue/consumer.js
// Consume order events from a topic exchange with dedicated queues.
// Backward-compatible: also consumes legacy direct-queue names ("order_rejected", "order_accepted")
// until all publishers migrate to the exchange.
//
// Env:
//   RABBITMQ_URL                (default: amqp://rabbitmq:5672)
//   RABBITMQ_ORDER_EXCHANGE     (default: order.events)
//   RABBITMQ_PREFETCH           (default: 10)
//   NOTIFICATION_LEGACY_QUEUES  (default: 1) -> also consume legacy queues

import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const EXCHANGE = process.env.RABBITMQ_ORDER_EXCHANGE || 'order.events';
const EXCHANGE_TYPE = 'topic';
const PREFETCH = parseInt(process.env.RABBITMQ_PREFETCH || '10', 10);
const USE_LEGACY = (process.env.NOTIFICATION_LEGACY_QUEUES ?? '1') !== '0';

// Dedicated queues bound to exchange (no contention with other services)
const Q_ORDER_ACCEPTED = process.env.NOTIF_Q_ORDER_ACCEPTED || 'notification.order.accepted';
const Q_ORDER_REJECTED = process.env.NOTIF_Q_ORDER_REJECTED || 'notification.order.rejected';

// Legacy direct-queue names (temporary compatibility)
const LEGACY_Q_ACCEPTED = 'order_accepted';
const LEGACY_Q_REJECTED = 'order_rejected';

export async function startConsumer() {
  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();

  channel.on('error', (err) => {
    console.error('❌ RabbitMQ channel error:', err?.message || err);
  });

  channel.prefetch(PREFETCH);

  // Topic exchange for order events
  await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });

  // New, durable queues bound to exchange
  await channel.assertQueue(Q_ORDER_ACCEPTED, { durable: true, autoDelete: false });
  await channel.bindQueue(Q_ORDER_ACCEPTED, EXCHANGE, 'order.accepted');

  await channel.assertQueue(Q_ORDER_REJECTED, { durable: true, autoDelete: false });
  await channel.bindQueue(Q_ORDER_REJECTED, EXCHANGE, 'order.rejected');

  // Start consumers (exchange-driven)
  channel.consume(
    Q_ORDER_ACCEPTED,
    (msg) => handleMessage(channel, 'order.accepted', msg),
    { noAck: false }
  );

  channel.consume(
    Q_ORDER_REJECTED,
    (msg) => handleMessage(channel, 'order.rejected', msg),
    { noAck: false }
  );

  // Legacy direct queues (optional)
  if (USE_LEGACY) {
    await channel.assertQueue(LEGACY_Q_ACCEPTED, { durable: false });
    await channel.assertQueue(LEGACY_Q_REJECTED, { durable: false });

    channel.consume(
      LEGACY_Q_ACCEPTED,
      (msg) => handleMessage(channel, 'order.accepted (legacy)', msg),
      { noAck: false }
    );
    channel.consume(
      LEGACY_Q_REJECTED,
      (msg) => handleMessage(channel, 'order.rejected (legacy)', msg),
      { noAck: false }
    );
  }

  console.log('🟢 Listening for notifications…');
  console.log(`🔗 Exchange: ${EXCHANGE} (${EXCHANGE_TYPE}), prefetch=${PREFETCH}`);
  console.log(`📥 Queues: ${Q_ORDER_ACCEPTED} -> order.accepted, ${Q_ORDER_REJECTED} -> order.rejected${USE_LEGACY ? `; legacy: ${LEGACY_Q_ACCEPTED}, ${LEGACY_Q_REJECTED}` : ''}`);
}

function handleMessage(ch, kind, msg) {
  if (!msg) return;
  try {
    const data = JSON.parse(msg.content.toString());
    if (kind.startsWith('order.accepted')) {
      console.log('✅ ORDER ACCEPTED', data);
    } else if (kind.startsWith('order.rejected')) {
      console.log('❗ ORDER REJECTED ❗', data);
    } else {
      console.log(`[${kind}]`, data);
    }
    ch.ack(msg);
  } catch (err) {
    console.error('❌ Notification handler failed:', err?.message || err);
    ch.nack(msg, false, true);
  }
}
