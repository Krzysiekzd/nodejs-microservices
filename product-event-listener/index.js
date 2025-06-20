require('dotenv').config();
const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL;

async function start() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue('product_created', { durable: false });
    await channel.assertQueue('product_updated', { durable: false });

    console.log('🟢 Waiting for product events...');

    channel.consume('product_created', msg => {
      const content = msg.content.toString();
      console.log('📦 [CREATE] product_created event:', JSON.parse(content));
      channel.ack(msg);
    });

    channel.consume('product_updated', msg => {
      const content = msg.content.toString();
      console.log('🛠️ [UPDATE] product_updated event:', JSON.parse(content));
      channel.ack(msg);
    });
  } catch (err) {
    console.error('❌ RabbitMQ error:', err);
  }
}

start();
