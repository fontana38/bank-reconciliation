import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConciliateMovementsUseCase } from 'src/application/use-cases/conciliate-movements.use-case';
import { GetReconciliationResultsUseCase } from 'src/application/use-cases/get-reconciliation-results.use-case';

import { ImportBankFileUseCase } from 'src/application/use-cases/import-bank-file.use-case';
import { ImportSystemFileUseCase } from 'src/application/use-cases/import-system-file.use-case';

import { MovementRepository } from 'src/domain/repositories/movement.repository';
import { MovementMongoRepository } from 'src/infrastructure/database/mongoose/repositories/movement-mongo.repository';
import {
  MOVEMENT_MODEL,
  MovementMongoSchema,
} from 'src/infrastructure/database/mongoose/schemas/movement.schema';

import { ImportsController } from 'src/presentation/controllers/imports.controller';
import { ReconciliationController } from 'src/presentation/controllers/reconciliation.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MOVEMENT_MODEL,
        schema: MovementMongoSchema,
      },
    ]),
  ],
  controllers: [ImportsController, ReconciliationController],
  providers: [
    ImportBankFileUseCase,
    ImportSystemFileUseCase,
    ConciliateMovementsUseCase,   
    GetReconciliationResultsUseCase,
    {
      provide: MovementRepository,
      useClass: MovementMongoRepository,
    },
  ],
})
export class ReconciliationModule {}