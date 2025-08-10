// inventory-service/src/queue/publisher.js
// Topic publisher with confirms, durable exchange and "mandatory" return logging (ESM).

import amqplib from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const ORDER_EXCHANGE = process.env.RABBITMQ_ORDER_EXCHANGE || 'order.events';
const EXCHANGE_TYPE = 'topic';
const RECONNECT_MS = parseInt(process.env.RABBITMQ_RECONNECT_MS || '2000', 10);

let connection;
let channel;
let reconnectTimer = null;
let returnHandlerInstalled = false;

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    channel = undefined;
    connection = undefined;
  }, RECONNECT_MS);
}

async function ensureChannel() {
  if (channel) return channel;

  connection = await amqplib.connect(RABBITMQ_URL);
  connection.on('error', (e) => console.error('❌ RMQ connection error:', e?.message || e));
  connection.on('close', () => {
    console.warn('⚠️  RMQ connection closed; scheduling reconnect…');
    scheduleReconnect();
  });

  channel = await connection.createConfirmChannel();
  channel.on('error', (e) => console.error('❌ RMQ channel error:', e?.message || e));
  channel.on('close', () => {
    console.warn('⚠️  RMQ channel closed; scheduling reconnect…');
    scheduleReconnect();
  });

  await channel.assertExchange(ORDER_EXCHANGE, EXCHANGE_TYPE, { durable: true });

  if (!returnHandlerInstalled) {
    channel.on('return', (msg) => {
      try {
        const body = msg?.content?.toString();
        console.error(`⛔ unroutable message exchange=${msg.fields.exchange} rk=${msg.fields.routingKey}: ${body}`);
      } catch {
        console.error('⛔ unroutable message (failed to stringify)');
      }
    });
    returnHandlerInstalled = true;
  }

  return channel;
}

function toBuffer(payload) {
  if (Buffer.isBuffer(payload)) return payload;
  if (typeof payload === 'string') return Buffer.from(payload);
  return Buffer.from(JSON.stringify(payload));
}

// Named export (i default – oba wskazują tę samą funkcję)
export async function publishOrderEvent(routingKey, payload, options = {}) {
  const ch = await ensureChannel();

  const ok = ch.publish(
    ORDER_EXCHANGE,
    routingKey,
    toBuffer(payload),
    {
      persistent: true,
      contentType: 'application/json',
      mandatory: true,
      ...options,
    }
  );

  // Wait for publisher confirms — jeśli broker odrzuci, poleci wyjątek
  await ch.waitForConfirms();

  if (!ok) {
    console.warn('⚠️  channel.publish returned false (high watermark), message was queued for later send');
  }
  return true;
}

export default publishOrderEvent;
