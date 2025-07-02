import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { ProxyService } from '../proxy/proxy.service';
import * as dotenv from 'dotenv';
dotenv.config();

@Controller('products')
export class ProductsController {
  constructor(private proxy: ProxyService) {}

  @Get()
  getAll() {
    return this.proxy.forwardGet(`${process.env.PRODUCT_SERVICE_URL}/products`);
  }

  @Post()
  create(@Body() body: any) {
    return this.proxy.forwardPost(`${process.env.PRODUCT_SERVICE_URL}/products`, body);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.proxy.forwardGet(`${process.env.PRODUCT_SERVICE_URL}/products/${id}`);
  }

  @Get(':id/stock')
  getStock(@Param('id') id: string) {
    return this.proxy.forwardGet(`${process.env.INVENTORY_SERVICE_URL}/products/${id}/stock`);
  }

  @Patch(':id/replenish')
  replenish(@Param('id') id: string, @Body() body: any) {
    return this.proxy.forwardPatch(`${process.env.INVENTORY_SERVICE_URL}/products/${id}/replenish`, body);
  }
}
