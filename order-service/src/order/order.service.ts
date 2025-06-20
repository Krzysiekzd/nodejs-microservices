import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { publishToQueue } from 'src/utils/rabbitmq';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private repo: Repository<Order>
  ) {}

  async createOrder(data: Partial<Order>) {
    const order = this.repo.create(data);
    const saved = await this.repo.save(order);
    await publishToQueue('order_created', saved);
    return saved;
  }


  async updateOrder(id: string, updates: Partial<Order>) {
    await this.repo.update(id, updates);
    const updated = await this.repo.findOne({ where: { id } });
    if (updated) {
      await publishToQueue('order_updated', updated);
    }
    return updated;
  }

  async getAll() {
    return this.repo.find();
  }
}
