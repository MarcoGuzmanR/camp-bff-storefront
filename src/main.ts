import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',  // Allow frontend running on port 3000
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed methods
    allowedHeaders: 'Content-Type, Accept', // Allowed headers
  });

  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3003);
}
bootstrap();
