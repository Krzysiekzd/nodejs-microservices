import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { IsUUID, IsInt, Min } from 'class-validator';

class CreateOrderDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  userId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

class UpdateOrderDto {
  @IsInt()
  @Min(1)
  quantity: number;
}

@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  create(@Body() body: CreateOrderDto) {
    return this.orderService.createOrder(body);
  }

  @Get()
  findAll() {
    return this.orderService.getAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateOrderDto) {
    return this.orderService.updateOrder(id, body);
  }

}
