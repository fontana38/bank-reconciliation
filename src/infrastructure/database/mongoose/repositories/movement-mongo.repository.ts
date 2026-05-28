import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MovementRepository } from '../../../../domain/repositories/movement.repository';
import { Movement } from '../../../../domain/entities/movement.entity';
import {
  MovementDocument,
  MovementSchema,
} from '../schemas/movement.schema';

@Injectable()
export class MovementMongoRepository implements MovementRepository {
  constructor(
    @InjectModel(MovementSchema.name)
    private readonly movementModel: Model<MovementDocument>,
  ) {}
    findPending(): Promise<Movement[]> {
        throw new Error('Method not implemented.');
    }
    update(movement: Movement): Promise<void> {
        throw new Error('Method not implemented.');
    }

  async saveMany(movements: Movement[]): Promise<void> {
    await this.movementModel.insertMany(movements);
  }
}