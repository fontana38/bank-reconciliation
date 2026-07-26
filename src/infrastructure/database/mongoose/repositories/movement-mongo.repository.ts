import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DeleteResult, Model } from 'mongoose';

import { MovementRepository } from '../../../../domain/repositories/movement.repository';
import { Movement } from '../../../../domain/entities/movement.entity';
import {
  MovementDocument,
  MOVEMENT_MODEL,
} from '../schemas/movement.schema';

@Injectable()
export class MovementMongoRepository implements MovementRepository {
  private readonly logger = new Logger(MovementMongoRepository.name);

  constructor(
    @InjectModel(MOVEMENT_MODEL)
    private readonly movementModel: Model<MovementDocument>,
  ) {}

  async findByStatus(status?: string): Promise<Movement[]> {
    const filter = status ? { status } : {};

    return this.movementModel
      .find(filter as any)
      .lean() as unknown as Promise<Movement[]>;
  }

  async findPending(): Promise<Movement[]> {
    return this.movementModel
      .find({ status: 'PENDING' })
      .lean() as unknown as Promise<Movement[]>;
  }

  async saveMany(movements: Movement[]): Promise<void> {
    // ordered: false permite que, si una fila falla validación de schema,
    // las demás se inserten igual en lugar de abortar todo el batch.
    try {
      await this.movementModel.insertMany(movements, { ordered: false });
    } catch (error: any) {
      const insertedCount = error?.insertedDocs?.length ?? 0;
      const failedCount = error?.writeErrors?.length ?? 0;
      this.logger.warn(
        `saveMany completado con errores: ${insertedCount} insertados, ${failedCount} fallidos`,
      );
      if (failedCount > 0) {
        this.logger.warn(JSON.stringify(error.writeErrors?.slice(0, 5)));
      }
      // Si NINGUNA fila se insertó, sí es un error real que debe propagarse.
      if (insertedCount === 0) {
        throw error;
      }
    }
  }

  async findPendingBySource(
    source: 'bank' | 'system',
    bankCode: string,
    bankAccount: string,
    period: string,
  ): Promise<Movement[]> {
    return this.movementModel
      .find({
        source,
        status: 'PENDING',
        bankCode,
        bankAccount,
        period,
      })
      .lean() as unknown as Promise<Movement[]>;
  }

  async findByAccountAndPeriod(
    bankCode: string,
    bankAccount: string,
    period: string,
  ): Promise<Movement[]> {
    return this.movementModel
      .find({ bankCode, bankAccount, period })
      .lean() as unknown as Promise<Movement[]>;
  }

  async update(movement: Movement): Promise<void> {
    const { _id, ...rest } = movement;
    await this.movementModel.updateOne({ _id }, { $set: rest });
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.movementModel.updateOne({ _id: id }, { $set: { status } });
  }

  async deleteConciliation(): Promise<DeleteResult> {
    const result= await this.movementModel.deleteMany({});
     console.log('Movimientos eliminados:', result.deletedCount);
     return result 
  }
}