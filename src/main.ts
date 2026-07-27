import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';


async function bootstrap() {
  console.log("3 - Antes de crear Nest");

  const app = await NestFactory.create(AppModule);

  console.log("4 - Nest creado");

  const port = Number(process.env.PORT) || 3000;

  await app.listen(port, "0.0.0.0");

console.log(`5 - Escuchando en 0.0.0.0:${port}`);
}

bootstrap();
