import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { connectRabbitMQ } from './utils/rabbitmq';

async function bootstrap() {
  await connectRabbitMQ();
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3009);
}
bootstrap();
