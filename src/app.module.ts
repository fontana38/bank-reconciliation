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
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    console.log("1 - Entró al useFactory");

    const uri = config.getOrThrow<string>("MONGO_URI");

    console.log("2 - URI obtenida");

    return {
      uri,
      serverSelectionTimeoutMS: 5000,
    };
  },
}),

    ReconciliationModule,
  ],
})
export class AppModule {}