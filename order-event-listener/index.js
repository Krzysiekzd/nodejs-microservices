// order-event-listener/index.js
// Dedicated queues bound to a topic exchange so this listener does not compete with other services.

require('dotenv').config();
const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const EXCHANGE = process.env.RABBITMQ_ORDER_EXCHANGE || 'order.events';
const EXCHANGE_TYPE = 'topic';

const Q_CREATED = process.env.DEBUG_ORDER_CREATED_QUEUE || 'debug.order.created';
const Q_UPDATED = process.env.DEBUG_ORDER_UPDATED_QUEUE || 'debug.order.updated';

const PREFETCH = parseInt(process.env.RABBITMQ_PREFETCH || '10', 10);
const RECONNECT_MS = parseInt(process.env.RABBITMQ_RECONNECT_MS || '2000', 10);

let connection;
let channel;
let reconnectTimer = null;

async function setup() {
  connection = await amqplibConnect();
  channel = await connection.createChannel();

  channel.on('error', (err) => {
    console.error('❌ RabbitMQ channel error:', err?.message || err);
  });

  channel.on('close', () => {
    console.warn('⚠️  RabbitMQ channel closed. Reconnecting…');
    scheduleReconnect();
  });

  await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });

  await channel.assertQueue(Q_CREATED, { durable: true, autoDelete: false });
  await channel.bindQueue(Q_CREATED, EXCHANGE, 'order.created');

  await channel.assertQueue(Q_UPDATED, { durable: true, autoDelete: false });
  await channel.bindQueue(Q_UPDATED, EXCHANGE, 'order.updated');

  channel.prefetch(PREFETCH);

  console.log('🟢 Listening for order events…');
  console.log(`🔗 Exchange: ${EXCHANGE} (${EXCHANGE_TYPE})`);
  console.log(`📥 Queues: ${Q_CREATED} -> order.created, ${Q_UPDATED} -> order.updated`);

  channel.consume(Q_CREATED, (msg) => handleMessage('order.created', msg), { noAck: false });
  channel.consume(Q_UPDATED, (msg) => handleMessage('order.updated', msg), { noAck: false });
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

async function amqplibConnect() {
  const conn = await amqp.connect(RABBITMQ_URL);
  conn.on('error', (err) => {
    console.error('❌ RabbitMQ connection error:', err?.message || err);
  });
  conn.on('close', () => {
    console.warn('⚠️  RabbitMQ connection closed. Reconnecting…');
    scheduleReconnect();
  });
  return conn;
}

function handleMessage(kind, msg) {
  if (!msg) return;
  try {
    const content = JSON.parse(msg.content.toString());
    console.log(`📦 [${kind.toUpperCase()}] Event received:`, content);
    channel.ack(msg);
  } catch (err) {
    console.error('❌ Failed to process message:', err?.message || err);
    channel.nack(msg, false, true);
  }
}

async function start() {
  try {
    await setup();
  } catch (err) {
    console.error('❌ Failed to start order-event-listener:', err?.message || err);
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
