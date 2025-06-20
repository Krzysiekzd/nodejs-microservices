import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { RabbitMQService } from 'src/rabbitmq/rabbitmq.service';
//import { ProductService } from 'src/product/product.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  providers: [
    OrderService, 
    RabbitMQService, 
    //ProductService
  ],
  controllers: [OrderController],
})
export class OrderModule {}
