const amqp = require('amqplib');

let channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
  }
}

async function publishToQueue(queueName, message) {
  if (!channel) return;
  await channel.assertQueue(queueName, { durable: false });
  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));
}

module.exports = {
  connectRabbitMQ,
  publishToQueue,
};
