import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Register the global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());
  
  await app.listen(process.env.PORT ?? 3011);
}
bootstrap();
