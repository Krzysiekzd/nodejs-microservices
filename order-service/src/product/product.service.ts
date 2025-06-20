import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';

@Injectable()
export class ProductService {
  constructor(
      @InjectRepository(Product) private productRepo: Repository<Product>
  ) {}

  async upsertProduct(data: Partial<Product>) {
    const product = this.productRepo.create(data);
    return this.productRepo.save(product);
  }

  async getById(id: string) {
    return this.productRepo.findOne({ where: { id } });
  }
}
