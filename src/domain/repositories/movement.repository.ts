import { Movement } from "../entities/movement.entity";


  export abstract class MovementRepository {

  abstract saveMany(movements: Movement[]): Promise<void>;

  abstract findPending(): Promise<Movement[]>;

   abstract findPendingBySource(source: 'bank' | 'system'): Promise<Movement[]>;

  abstract update(movement: Movement): Promise<void>;

  abstract updateStatus(id: string, status: string): Promise<void>;

   abstract findByStatus(status?: string): Promise<Movement[]>;
  
}