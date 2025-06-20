import * as amqp from 'amqplib';

let channel: amqp.Channel;

export async function connectRabbitMQ() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
  channel = await connection.createChannel();
  console.log('✅ order-service connected to RabbitMQ');
}

export async function publishToQueue(queue: string, payload: any) {
  if (!channel) return;
  await channel.assertQueue(queue, { durable: false });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)));
  console.log(`📤 Published to ${queue}:`, payload);
}
