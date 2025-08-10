import { Controller, Get, Post, Body, Param, Patch, Req } from '@nestjs/common';
import { ProxyService } from '../proxy/proxy.service';
import { Request } from 'express';
import * as dotenv from 'dotenv';
dotenv.config();

@Controller('products')
export class ProductsController {
  constructor(private proxy: ProxyService) {}

  @Get()
  getAll(@Req() req: Request) {
    return this.proxy.forwardGet(`${process.env.PRODUCT_SERVICE_URL}/products`, req);
  }

  @Post()
  create(@Body() body: any, @Req() req: Request) {
    return this.proxy.forwardPost(`${process.env.PRODUCT_SERVICE_URL}/products`, body, req);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() req: Request) {
    return this.proxy.forwardGet(`${process.env.PRODUCT_SERVICE_URL}/products/${id}`, req);
  }

  @Get(':id/stock')
  getStock(@Param('id') id: string, @Req() req: Request) {
    return this.proxy.forwardGet(`${process.env.INVENTORY_SERVICE_URL}/products/${id}/stock`, req);
  }

  @Patch(':id/replenish')
  replenish(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    return this.proxy.forwardPatch(`${process.env.INVENTORY_SERVICE_URL}/products/${id}/replenish`, body, req);
  }
}
