// product-event-listener/index.js
// Dedicated queues bound to a topic exchange so this listener does not compete with other services.
// Each event is broadcast via the exchange and delivered to this service's own queues.

require('dotenv').config();
const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const EXCHANGE = process.env.RABBITMQ_PRODUCT_EXCHANGE || 'product.events';
const EXCHANGE_TYPE = 'topic';

// Separate queues so we never compete with inventory-service.
const Q_CREATED = process.env.DEBUG_PRODUCT_CREATED_QUEUE || 'debug.product.created';
const Q_UPDATED = process.env.DEBUG_PRODUCT_UPDATED_QUEUE || 'debug.product.updated';

const PREFETCH = parseInt(process.env.RABBITMQ_PREFETCH || '10', 10);
const RECONNECT_MS = parseInt(process.env.RABBITMQ_RECONNECT_MS || '2000', 10);

let connection;
let channel;
let reconnectTimer = null;

async function setup() {
  connection = await amqp.connect(RABBITMQ_URL);

  connection.on('error', (err) => {
    console.error('❌ RabbitMQ connection error:', err?.message || err);
  });

  connection.on('close', () => {
    console.warn('⚠️  RabbitMQ connection closed. Reconnecting…');
    scheduleReconnect();
  });

  channel = await connection.createChannel();

  channel.on('error', (err) => {
    console.error('❌ RabbitMQ channel error:', err?.message || err);
  });

  channel.on('close', () => {
    console.warn('⚠️  RabbitMQ channel closed. Reconnecting…');
    scheduleReconnect();
  });

  await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });

  // Create and bind dedicated queues for this service
  await channel.assertQueue(Q_CREATED, { durable: true, autoDelete: false });
  await channel.bindQueue(Q_CREATED, EXCHANGE, 'product.created');

  await channel.assertQueue(Q_UPDATED, { durable: true, autoDelete: false });
  await channel.bindQueue(Q_UPDATED, EXCHANGE, 'product.updated');

  channel.prefetch(PREFETCH);

  console.log('🟢 Waiting for product events…');
  console.log(`🔗 Exchange: ${EXCHANGE} (${EXCHANGE_TYPE})`);
  console.log(`📥 Queues: ${Q_CREATED} -> product.created, ${Q_UPDATED} -> product.updated`);

  channel.consume(
    Q_CREATED,
    (msg) => handleMessage('CREATE', msg),
    { noAck: false }
  );

  channel.consume(
    Q_UPDATED,
    (msg) => handleMessage('UPDATE', msg),
    { noAck: false }
  );
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await start();
    } catch (e) {
      console.error('❌ Reconnect failed:', e?.message || e);
      scheduleReconnect();
    }
  }, RECONNECT_MS);
}

function handleMessage(kind, msg) {
  if (!msg) return;
  try {
    const content = JSON.parse(msg.content.toString());
    if (kind === 'CREATE') {
      console.log('📦 [CREATE] product_created event:', content);
    } else {
      console.log('🛠️ [UPDATE] product_updated event:', content);
    }
    channel.ack(msg);
  } catch (err) {
    console.error('❌ Failed to process message:', err?.message || err);
    // Requeue once; if it keeps failing, it will loop. Consider DLX in production.
    channel.nack(msg, false, true);
  }
}

async function start() {
  try {
    await setup();
  } catch (err) {
    console.error('❌ RabbitMQ setup error:', err?.message || err);
    scheduleReconnect();
  }
}

process.on('SIGINT', async () => {
  try {
    console.log('👋 Shutting down gracefully…');
    if (channel) await channel.close();
    if (connection) await connection.close();
  } finally {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  try {
    console.log('👋 Shutting down gracefully…');
    if (channel) await channel.close();
    if (connection) await connection.close();
  } finally {
    process.exit(0);
  }
});

start();
