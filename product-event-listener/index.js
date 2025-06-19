require('dotenv').config();
const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME = 'product_created';

async function start() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: false });

    console.log(`🟢 Waiting for messages in queue: ${QUEUE_NAME}`);

    channel.consume(QUEUE_NAME, msg => {
      const content = msg.content.toString();
      console.log(`📦 Received product_created event:`, JSON.parse(content));
      channel.ack(msg);
    });
  } catch (err) {
    console.error('❌ Error in RabbitMQ listener:', err);
  }
}

start();
