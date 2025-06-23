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
  async getById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async deleteOrder(id: string) {
    const order = await this.repo.findOne({ where: { id } });
    if (order) {
      await this.repo.delete(id);
      // Optionally publish to queue:
      // await publishToQueue('order_deleted', { id });
    }
    return order;
  }

}
