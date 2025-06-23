import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProxyController } from './proxy/proxy.controller';
import { ProxyService } from './proxy/proxy.service';

@Module({
  imports: [HttpModule],
  controllers: [ProxyController],
  providers: [ProxyService],
})
export class AppModule {}