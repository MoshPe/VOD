import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors({
    origin: '*',
    methods: 'GET',
    allowedHeaders: 'Range, Content-Type',
  });

  const config = new DocumentBuilder()
    .setTitle('Video Streamer')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger-ui', app, documentFactory);

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
