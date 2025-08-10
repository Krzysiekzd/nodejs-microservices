// inventory-service/src/queue/consumer.js
// Dedicated durable queues bound to topic exchanges. Idempotent updates.

import amqplib from 'amqplib';
import { Product } from '../models/product.js';
import { publishOrderEvent } from './publisher.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';

const PRODUCT_EXCHANGE = process.env.RABBITMQ_PRODUCT_EXCHANGE || 'product.events';
const ORDER_EXCHANGE   = process.env.RABBITMQ_ORDER_EXCHANGE   || 'order.events';
const EXCHANGE_TYPE    = 'topic';

const Q_PRODUCT_CREATED = process.env.INVENTORY_Q_PRODUCT_CREATED || 'inventory.product.created';
const Q_ORDER_CREATED   = process.env.INVENTORY_Q_ORDER_CREATED   || 'inventory.order.created';

const PREFETCH     = parseInt(process.env.RABBITMQ_PREFETCH || '10', 10);
const RECONNECT_MS = parseInt(process.env.RABBITMQ_RECONNECT_MS || '2000', 10);

let connection;
let channel;
let reconnectTimer = null;

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connection = undefined;
    channel = undefined;
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

  channel = await connection.createChannel();
  channel.on('error', (e) => console.error('❌ RMQ channel error:', e?.message || e));
  channel.on('close', () => {
    console.warn('⚠️  RMQ channel closed; scheduling reconnect…');
    scheduleReconnect();
  });

  await channel.assertExchange(PRODUCT_EXCHANGE, EXCHANGE_TYPE, { durable: true });
  await channel.assertExchange(ORDER_EXCHANGE,   EXCHANGE_TYPE, { durable: true });

  await channel.assertQueue(Q_PRODUCT_CREATED, { durable: true, autoDelete: false });
  await channel.bindQueue(Q_PRODUCT_CREATED, PRODUCT_EXCHANGE, 'product.created');

  await channel.assertQueue(Q_ORDER_CREATED, { durable: true, autoDelete: false });
  await channel.bindQueue(Q_ORDER_CREATED, ORDER_EXCHANGE, 'order.created');

  channel.prefetch(PREFETCH);
  return channel;
}

function isTransientError(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('connection') ||
    msg.includes('econnreset') ||
    msg.includes('server selection') ||
    err?.name === 'MongoNetworkError'
  );
}

async function onProductCreated(evt) {
  // Upsert without conflicting paths:
  // - name/price in $set (apply always)
  // - stock only in $setOnInsert (init once)
  await Product.updateOne(
    { _id: evt.id },
    {
      $set: { name: evt.name, price: evt.price },
      $setOnInsert: { stock: 0 },
    },
    { upsert: true }
  );
  console.log('✅ Product upserted in inventory:', {
    _id: evt.id, name: evt.name, price: evt.price,
  });
}

async function onOrderCreated(evt) {
  const { id: orderId, productId, quantity } = evt;

  const qty = Number(quantity) || 0;
  if (qty <= 0) {
    console.warn('❗ order.created with non-positive quantity:', evt);
    await publishOrderEvent('order.rejected', { orderId, productId, quantity: qty, reason: 'invalid_quantity' });
    return;
  }

  // Atomic decrement only if enough stock
  const res = await Product.updateOne(
    { _id: productId, stock: { $gte: qty } },
    { $inc: { stock: -qty } }
  );

  if (res.modifiedCount === 1) {
    console.log('✅ Stock updated for', productId, `(-${qty})`);
    await publishOrderEvent('order.accepted', { orderId, productId, quantity: qty });
  } else {
    console.warn('❗ Not enough stock for', productId, 'requested', qty);
    await publishOrderEvent('order.rejected', { orderId, productId, quantity: qty, reason: 'insufficient_stock' });
  }
}

export async function startConsumer() {
  const ch = await ensureChannel();

  console.log('🟢 Inventory consumer ready');
  console.log(`🔗 Exchanges: ${PRODUCT_EXCHANGE}, ${ORDER_EXCHANGE}`);
  console.log(`📥 Queues: ${Q_PRODUCT_CREATED} -> product.created, ${Q_ORDER_CREATED} -> order.created`);

  ch.consume(
    Q_PRODUCT_CREATED,
    async (msg) => {
      if (!msg) return;
      try {
        const evt = JSON.parse(msg.content.toString());
        await onProductCreated(evt);
        ch.ack(msg);
      } catch (e) {
        const retry = isTransientError(e) ? 'requeue' : 'ack';
        console.error('❌ product.created handler failed:', e?.message || e, `→ ${retry}`);
        if (isTransientError(e)) ch.nack(msg, false, true);
        else ch.ack(msg); // non-retryable: do not poison the queue
      }
    },
    { noAck: false }
  );

  ch.consume(
    Q_ORDER_CREATED,
    async (msg) => {
      if (!msg) return;
      try {
        const evt = JSON.parse(msg.content.toString());
        await onOrderCreated(evt);
        ch.ack(msg);
      } catch (e) {
        const retry = isTransientError(e) ? 'requeue' : 'ack';
        console.error('❌ order.created handler failed:', e?.message || e, `→ ${retry}`);
        if (isTransientError(e)) ch.nack(msg, false, true);
        else ch.ack(msg);
      }
    },
    { noAck: false }
  );
}
