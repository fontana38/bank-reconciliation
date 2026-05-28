import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportBankFileUseCase } from 'src/application/use-cases/import-bank-file.use-case';
import { MovementRepository } from 'src/domain/repositories/movement.repository';
import { MovementMongoRepository } from 'src/infrastructure/database/mongoose/repositories/movement-mongo.repository';
import { MovementMongoSchema, MovementSchema } from 'src/infrastructure/database/mongoose/schemas/movement.schema';
import { ImportsController } from 'src/presentation/controllers/imports.controller';


@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MovementSchema.name,
        schema: MovementMongoSchema,
      },
    ]),
  ],
  controllers: [ImportsController],
  providers: [
    ImportBankFileUseCase,
    {
      provide: MovementRepository,
      useClass: MovementMongoRepository,
    },
  ],
})
export class ReconciliationModule {}