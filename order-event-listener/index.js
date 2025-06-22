require('dotenv').config();
const amqp = require('amqplib');

const QUEUES = ['order_created', 'order_updated'];

async function start() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
    const channel = await connection.createChannel();

    for (const queue of QUEUES) {
      await channel.assertQueue(queue, { durable: false });
      channel.consume(queue, msg => {
        if (msg !== null) {
          const content = msg.content.toString();
          console.log(`📦 [${queue.toUpperCase()}] Event received:`, JSON.parse(content));
          channel.ack(msg);
        }
      });
    }

    console.log(`🟢 Listening for order events: ${QUEUES.join(', ')}`);
  } catch (err) {
    console.error('❌ Failed to start order-event-listener:', err);
  }
}
start();
