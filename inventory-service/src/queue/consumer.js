import amqp from 'amqplib';
import { Product } from '../models/product.js';

let channel;

async function publishToQueue(queue, data) {
  await channel.assertQueue(queue, { durable: false });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
  console.log(`📤 Published to ${queue}`, data);
}

export async function startConsumer() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await conn.createChannel();

  await channel.assertQueue('product_created', { durable: false });
  channel.consume('product_created', async (msg) => {
    if (!msg) return;
    const data = JSON.parse(msg.content.toString());
    let product = await Product.findById(data.id);
    if (!product) {
      product = new Product({
        _id: data.id,
        name: data.name,
        price: data.price,
        stock: typeof data.stock === 'number' ? data.stock : 0,
      });
      await product.save();
      console.log('✅ Product created in inventory:', product);
    }
    channel.ack(msg);
  });

  const queue = 'order_created';
  await channel.assertQueue(queue, { durable: false });

  console.log(`🎧 Listening to queue: ${queue}`);

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const order = JSON.parse(msg.content.toString());
    console.log('📥 Received order_created:', order);

    const product = await Product.findById(order.productId);

    if (!product) {
      console.log('❌ Product not found');
      await publishToQueue('order_rejected', {
        orderId: order.id,
        reason: 'Product not found',
      });
      return channel.ack(msg);
    }

    if (product.stock < order.quantity) {
      console.log('❌ Insufficient stock');
      await publishToQueue('order_rejected', {
        orderId: order.id,
        reason: 'Insufficient stock',
      });
    } else {
      product.stock -= order.quantity;
      await product.save();
      console.log(`✅ Stock updated for ${product._id}`);

      await publishToQueue('order_accepted', {
        orderId: order.id,
        productId: product._id,
        quantity: order.quantity,
      });
    }

    channel.ack(msg);
  });
}