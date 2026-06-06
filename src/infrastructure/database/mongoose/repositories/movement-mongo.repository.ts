import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MovementRepository } from '../../../../domain/repositories/movement.repository';
import { Movement } from '../../../../domain/entities/movement.entity';
import {
  MovementDocument,
  MOVEMENT_MODEL,
} from '../schemas/movement.schema';

@Injectable()
export class MovementMongoRepository implements MovementRepository {
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

  findPending(): Promise<Movement[]> {
    throw new Error('Method not implemented.');
  }

  async saveMany(movements: Movement[]): Promise<void> {
    await this.movementModel.insertMany(movements);
  }

 async findPendingBySource(source: 'bank' | 'system'): Promise<Movement[]> {
  return this.movementModel
    .find({ source, status: 'PENDING' })
    .lean() as unknown as Promise<Movement[]>;
}
 

  async update(movement: Movement): Promise<void> {
    await this.movementModel.updateOne(
      { _id: movement.id },
      { $set: movement },
    );
  }

async updateStatus(id: string, status: string): Promise<void> {
  console.log('Updating movement:', id, status);

  const result = await this.movementModel.updateOne(
    { _id: id },
    { $set: { status } },
  );

  console.log('Update result:', result);
}
}