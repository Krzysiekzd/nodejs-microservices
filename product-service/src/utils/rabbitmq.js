// product-service/src/utils/rabbitmq.js
// Publisher with topic exchange, publisher confirms, persistent messages.
// Backward-compatible: publishToQueue('product_created', payload) maps to routing key 'product.created'.

const amqp = require('amqplib');

const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const EXCHANGE = process.env.RABBITMQ_PRODUCT_EXCHANGE || 'product.events';
const EXCHANGE_TYPE = 'topic';

let connection;
let channel;
let reconnectTimer;
let connecting = false;

function mapQueueToRoutingKey(name = '') {
  // map legacy queue names to routing keys
  if (name === 'product_created') return 'product.created';
  if (name === 'product_updated') return 'product.updated';
  // generic fallback: replace first underscore with dot
  return String(name).replace('_', '.');
}

async function createConnection() {
  const conn = await amqp.connect(RABBIT_URL);
  conn.on('error', (err) => {
    console.error('❌ RabbitMQ connection error:', err?.message || err);
  });
  conn.on('close', () => {
    console.warn('⚠️  RabbitMQ connection closed. Scheduling reconnect…');
    scheduleReconnect();
  });
  return conn;
}

async function createChannel(conn) {
  // confirm channel to get publisher confirms
  const ch = await conn.createConfirmChannel();
  await ch.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });
  ch.on('error', (err) => {
    console.error('❌ RabbitMQ channel error:', err?.message || err);
  });
  ch.on('close', () => {
    console.warn('⚠️  RabbitMQ channel closed. Scheduling reconnect…');
    scheduleReconnect();
  });
  return ch;
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await connectRabbitMQ();
    } catch (e) {
      console.error('❌ RabbitMQ reconnect failed:', e?.message || e);
      scheduleReconnect(); // try again later
    }
  }, 2000);
}

async function connectRabbitMQ() {
  if (connecting) return;
  connecting = true;
  try {
    connection = await createConnection();
    channel = await createChannel(connection);
    console.log('🚀 Connected to RabbitMQ (exchange:', EXCHANGE, ')');
  } finally {
    connecting = false;
  }
}

function ensureBuffer(message) {
  if (Buffer.isBuffer(message)) return message;
  if (typeof message === 'string') return Buffer.from(message);
  return Buffer.from(JSON.stringify(message));
}

async function publishWithRoutingKey(routingKey, message, options = {}) {
  if (!channel) {
    await connectRabbitMQ();
  }
  const body = ensureBuffer(message);
  const ok = channel.publish(
    EXCHANGE,
    routingKey,
    body,
    {
      persistent: true,
      contentType: 'application/json',
      ...options,
    }
  );
  // Wait for publisher confirms to ensure the broker has persisted the message
  await channel.waitForConfirms();
  return ok;
}

// Backward-compatible API used by existing controllers
async function publishToQueue(queueName, message, options = {}) {
  const routingKey = mapQueueToRoutingKey(queueName);
  try {
    return await publishWithRoutingKey(routingKey, message, options);
  } catch (err) {
    console.error(`❌ publishToQueue(${queueName}) failed:`, err?.message || err);
    // one-shot reconnect and retry
    try {
      await connectRabbitMQ();
      return await publishWithRoutingKey(routingKey, message, options);
    } catch (err2) {
      console.error(`❌ retry publishToQueue(${queueName}) failed:`, err2?.message || err2);
      throw err2;
    }
  }
}

// Preferred new API
async function publishProductEvent(eventRoutingKey, message, options = {}) {
  // e.g. eventRoutingKey = 'product.created'
  try {
    return await publishWithRoutingKey(eventRoutingKey, message, options);
  } catch (err) {
    console.error(`❌ publishProductEvent(${eventRoutingKey}) failed:`, err?.message || err);
    try {
      await connectRabbitMQ();
      return await publishWithRoutingKey(eventRoutingKey, message, options);
    } catch (err2) {
      console.error(`❌ retry publishProductEvent(${eventRoutingKey}) failed:`, err2?.message || err2);
      throw err2;
    }
  }
}

module.exports = {
  connectRabbitMQ,
  publishToQueue,        // legacy-compatible
  publishProductEvent,   // preferred
};
