import amqp from 'amqplib';

export async function startConsumer() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await conn.createChannel();

  const queue = 'order_rejected';
  await channel.assertQueue(queue, { durable: false });

  console.log(`📨 Listening for notifications on queue: ${queue}`);

  channel.consume(queue, (msg) => {
    if (!msg) return;
    const data = JSON.parse(msg.content.toString());

    console.log(`❗ ORDER REJECTED ❗`, data);

    channel.ack(msg);
  });
}
