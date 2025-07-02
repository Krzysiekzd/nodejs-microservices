import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { ProxyService } from '../proxy/proxy.service';
import * as dotenv from 'dotenv';
dotenv.config();

@Controller('orders')
export class OrdersController {
  constructor(private proxy: ProxyService) {}

  @Get()
  getAll() {
    return this.proxy.forwardGet(`${process.env.ORDER_SERVICE_URL}/orders`);
  }

  @Post()
  create(@Body() body: any) {
    return this.proxy.forwardPost(`${process.env.ORDER_SERVICE_URL}/orders`, body);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.proxy.forwardGet(`${process.env.ORDER_SERVICE_URL}/orders/${id}`);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.proxy.forwardPatch(`${process.env.ORDER_SERVICE_URL}/orders/${id}`, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.proxy.forwardPatch(`${process.env.ORDER_SERVICE_URL}/orders/${id}`, {});
  }
}