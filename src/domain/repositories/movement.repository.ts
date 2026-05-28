import { Movement } from "../entities/movement.entity";


  export abstract class MovementRepository {
  abstract saveMany(movements: Movement[]): Promise<void>;

  abstract findPending(): Promise<Movement[]>;

  abstract update(movement: Movement): Promise<void>;
  
}