import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { ProductService } from '../product/product.service';
import { Inject } from '@nestjs/common';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly queue = 'product_created';

  //constructor(private readonly productService: ProductService) {}

  async onModuleInit() {
    await this.connect();
    //await this.consume();
  }

  private async connect() {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
      this.channel = await this.connection.createChannel();
      console.log('✅ Connected to RabbitMQ (order-service)');
    } catch (err) {
      console.error('❌ RabbitMQ connection failed:', err);
    }
  }

  /*private async consume() {
    if (!this.channel) return;

    await this.channel.assertQueue(this.queue, { durable: false });

    this.channel.consume(this.queue, (msg) => {
      if (msg !== null) {
        const content = msg.content.toString();
        const product = JSON.parse(content);

        console.log('📥 [ORDER-SERVICE] Received product_created:', product);

        this.productService.upsertProduct(product);

        this.channel.ack(msg);
      }
    });
  }*/
}
