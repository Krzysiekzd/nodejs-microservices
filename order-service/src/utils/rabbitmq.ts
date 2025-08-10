// order-service/src/utils/rabbitmq.ts
// Publisher using a topic exchange with publisher confirms and persistent messages.
// Backward-compatible: publishToQueue('order_created', payload) maps to routing key 'order.created'.

import * as amqp from 'amqplib';

type Connection = amqp.Connection;
type ConfirmChannel = amqp.ConfirmChannel;

const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const EXCHANGE = process.env.RABBITMQ_ORDER_EXCHANGE || 'order.events';
const EXCHANGE_TYPE: 'topic' = 'topic';

let connection: Connection | undefined;
let channel: ConfirmChannel | undefined;

function mapQueueToRoutingKey(name = ''): string {
  if (name === 'order_created') return 'order.created';
  if (name === 'order_updated') return 'order.updated';
  if (name === 'order_accepted') return 'order.accepted';
  // generic fallback
  return String(name).replace('_', '.');
}

async function createConnection(): Promise<Connection> {
  const conn = await amqp.connect(RABBIT_URL);
  conn.on('error', (err) => {
    console.error('❌ RabbitMQ connection error:', (err as any)?.message || err);
  });
  conn.on('close', () => {
    console.warn('⚠️  RabbitMQ connection closed');
    channel = undefined;
    connection = undefined;
  });
  return conn;
}

async function createChannel(conn: Connection): Promise<ConfirmChannel> {
  const ch = await conn.createConfirmChannel();
  await ch.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });
  ch.on('error', (err) => {
    console.error('❌ RabbitMQ channel error:', (err as any)?.message || err);
  });
  ch.on('close', () => {
    console.warn('⚠️  RabbitMQ channel closed');
    channel = undefined;
  });
  return ch;
}

export async function connectRabbitMQ(): Promise<void> {
  if (channel) return;
  connection = await createConnection();
  channel = await createChannel(connection);
  console.log(`✅ order-service connected to RabbitMQ (exchange: ${EXCHANGE})`);
}

function toBuffer(message: any): Buffer {
  if (Buffer.isBuffer(message)) return message;
  if (typeof message === 'string') return Buffer.from(message);
  return Buffer.from(JSON.stringify(message));
}

async function publishWithRoutingKey(routingKey: string, payload: any, options: amqp.Options.Publish = {}): Promise<boolean> {
  if (!channel) {
    await connectRabbitMQ();
  }
  const body = toBuffer(payload);
  const ok = channel!.publish(
    EXCHANGE,
    routingKey,
    body,
    {
      persistent: true,
      contentType: 'application/json',
      ...options,
    }
  );
  await channel!.waitForConfirms();
  return ok;
}

// New, preferred API
export async function publishOrderEvent(routingKey: 'order.created' | 'order.updated' | 'order.accepted', payload: any): Promise<void> {
  try {
    await publishWithRoutingKey(routingKey, payload);
    console.log(`📤 Published to ${EXCHANGE} rk=${routingKey}:`, payload);
  } catch (err) {
    console.error(`❌ publishOrderEvent(${routingKey}) failed:`, (err as any)?.message || err);
    // one retry after reconnect
    await connectRabbitMQ();
    await publishWithRoutingKey(routingKey, payload);
    console.log(`📤 Published (retry) to ${EXCHANGE} rk=${routingKey}:`, payload);
  }
}

// Legacy-compatible API used in existing code
export async function publishToQueue(queue: string, payload: any): Promise<void> {
  const rk = mapQueueToRoutingKey(queue);
  await publishOrderEvent(rk as any, payload);
}
