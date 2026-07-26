import { DeleteResult } from "mongoose";
import { Movement } from "../entities/movement.entity";


export abstract class MovementRepository {

  abstract saveMany(movements: Movement[]): Promise<void>;

  abstract findPending(): Promise<Movement[]>;

  abstract findPendingBySource(
    source: 'bank' | 'system',
    bankCode: string,
    bankAccount: string,
    period: string,
  ): Promise<Movement[]>;

  /**
   * Trae TODOS los movimientos (sin filtrar por status) de una cuenta/período,
   * sin importar el source. Pensado para reportes que necesitan ver el cuadro
   * completo (MATCHED, BANK_ONLY, SYSTEM_ONLY juntos) de una conciliación ya
   * corrida, a diferencia de findPendingBySource que solo trae PENDING.
   */
  abstract findByAccountAndPeriod(
    bankCode: string,
    bankAccount: string,
    period: string,
  ): Promise<Movement[]>;

  abstract update(movement: Movement): Promise<void>;

  abstract updateStatus(id: string, status: string): Promise<void>;

  abstract findByStatus(status?: string): Promise<Movement[]>;

  abstract  deleteConciliation(): Promise<DeleteResult>
}