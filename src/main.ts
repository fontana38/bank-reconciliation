import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';


async function bootstrap() {
   const app = await NestFactory.create(AppModule)

  const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[]

  app.enableCors({
    origin: (origin, callback) => {
      // Permite Postman, curl y llamadas sin Origin
      if (!origin) {
        return callback(null, true)
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      console.error('Origen bloqueado por CORS:', origin)
      return callback(new Error(`Origen no permitido por CORS: ${origin}`), false)
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  const port = Number(process.env.PORT) || 3000;

  await app.listen(port, "0.0.0.0");


}

bootstrap();
