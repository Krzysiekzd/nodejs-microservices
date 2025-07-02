import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProductsController } from './routes/products.controller';
import { OrdersController } from './routes/orders.controller';
import { UsersController } from './routes/users.controller';
import { ProxyService } from './proxy/proxy.service';

@Module({
  imports: [HttpModule],
  controllers: [ProductsController, OrdersController, UsersController],
  providers: [ProxyService],
})
export class AppModule {}