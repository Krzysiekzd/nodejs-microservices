import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { connectRabbitMQ } from './utils/rabbitmq';

async function bootstrap() {
  await connectRabbitMQ();
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Order service running on port ${port}`);
}
bootstrap();
