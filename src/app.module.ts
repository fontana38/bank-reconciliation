import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const mongoUri = config.get<string>('MONGO_URI');

        console.log('MONGO_URI disponible:', Boolean(mongoUri));
        console.log('NODE_ENV:', config.get<string>('NODE_ENV'));

        if (!mongoUri) {
          throw new Error(
            'La variable de entorno MONGO_URI no está definida',
          );
        }

        return {
          uri: mongoUri,
        };
      },
    }),

    ReconciliationModule,
  ],
})
export class AppModule {}