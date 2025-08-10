import { Controller, Get, Post, Body, Param, Patch, Delete, Req } from '@nestjs/common';
import { ProxyService } from '../proxy/proxy.service';
import { Request } from 'express';
import * as dotenv from 'dotenv';
dotenv.config();

@Controller('orders')
export class OrdersController {
  constructor(private proxy: ProxyService) {}

  @Get()
  getAll(@Req() req: Request) {
    return this.proxy.forwardGet(`${process.env.ORDER_SERVICE_URL}/orders`, req);
  }

  @Post()
  create(@Body() body: any, @Req() req: Request) {
    return this.proxy.forwardPost(`${process.env.ORDER_SERVICE_URL}/orders`, body, req);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() req: Request) {
    return this.proxy.forwardGet(`${process.env.ORDER_SERVICE_URL}/orders/${id}`, req);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    return this.proxy.forwardPatch(`${process.env.ORDER_SERVICE_URL}/orders/${id}`, body, req);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.proxy.forwardDelete(`${process.env.ORDER_SERVICE_URL}/orders/${id}`, req);
  }
}
