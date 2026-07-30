import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Movement } from 'src/domain/entities/movement.entity';
import { MovementRepository } from 'src/domain/repositories/movement.repository';
import {
  TRANSFER_CONCEPTS,
  AMOUNT_TOLERANCE_PERCENTAGE,
} from 'src/config/reconciliation.config';
import { DeleteResult } from 'mongodb';

@Injectable()
export class ConciliateMovementsUseCase {
  constructor(private readonly movementRepository: MovementRepository) {}

  async execute(bankCode: string, bankAccount: string, period: string) {


    // Traemos los movimientos pendientes de conciliación del banco y del sistema.
    const allBankMovements = await this.movementRepository.findPendingBySource(
      'bank',
      bankCode,
      bankAccount,
      period,
    );

    const systemMovements = await this.movementRepository.findPendingBySource(
      'system',
      bankCode,
      bankAccount,
      period,
    );

    // Solo nos interesan las transferencias del lado del banco.
    // El resto (impuestos, comisiones, depósitos en efectivo, etc.) no se concilia.
    const bankMovements = allBankMovements.filter((m) =>
      this.isTransfer(m),
    );
    const bankExcluded = allBankMovements.length - bankMovements.length;

    const systemPool: Movement[] = [...systemMovements];
    const stillUnmatchedBank: Movement[] = [];
    const matchedPairs: Array<{ bank: Movement; system: Movement[] }> = [];

    // --- Pasada 1: matching 1-a-1 (monto con tolerancia + desempate por fecha) ---
    for (const bankMovement of bankMovements) {
      const bestMatch = this.findBestMatch(bankMovement, systemPool);

      if (bestMatch) {
        matchedPairs.push({ bank: bankMovement, system: [bestMatch] });

        const idx = systemPool.indexOf(bestMatch);
        systemPool.splice(idx, 1);
      } else {
        stillUnmatchedBank.push(bankMovement);
      }
    }

    // --- Pasada 2: matching agrupado por 'number' para los bancos que no
    // encontraron match 1-a-1. Cubre el caso de una transferencia bancaria
    // que corresponde a la suma de varias órdenes de pago del sistema con
    // el mismo número de comprobante (ej: pago a un proveedor en 2 líneas).
    const bankOnly: Movement[] = [];

    for (const bankMovement of stillUnmatchedBank) {
      const groupMatch = this.findGroupMatch(bankMovement, systemPool);

      if (groupMatch) {
        matchedPairs.push({ bank: bankMovement, system: groupMatch });

        for (const systemMovement of groupMatch) {
          const idx = systemPool.indexOf(systemMovement);
          systemPool.splice(idx, 1);
        }
      } else {
        bankOnly.push(bankMovement);
      }
    }

    const systemOnly = systemPool;
    const groupMatchedCount = matchedPairs.filter((p) => p.system.length > 1).length;

    // Persistimos los resultados. Cada par/grupo matched recibe un
    // reconciliationId común, para poder reconstruir después (en el reporte)
    // qué movimiento de banco corresponde a qué movimiento(s) de sistema.
    // Si tu MovementRepository soporta bulk updates, reemplazar este bloque
    // por updateMany(...) para evitar N round-trips a la DB.
    await Promise.all([
      ...matchedPairs.flatMap((pair) => {
        const reconciliationId = randomUUID();
        return [
          this.markMatched(pair.bank, reconciliationId),
          ...pair.system.map((s) => this.markMatched(s, reconciliationId)),
        ];
      }),
      ...bankOnly.map((m) => this.updateStatus(m, 'BANK_ONLY')),
      ...systemOnly.map((m) => this.updateStatus(m, 'SYSTEM_ONLY')),
    ]);

    return {
      totalBank: allBankMovements.length,
      bankExcludedNonTransfer: bankExcluded,
      totalBankTransfers: bankMovements.length,
      totalSystem: systemMovements.length,
      matched: matchedPairs.length,
      matchedAsGroup: groupMatchedCount,
      bankOnly: bankOnly.length,
      systemOnly: systemOnly.length,
    };
  }

  /**
   * Determina si un movimiento de banco corresponde a una transferencia,
   * según el concepto puro (no description, que mezcla Detalle/Concepto).
   * La comparación es case-insensitive para tolerar variaciones de
   * mayúsculas entre exportaciones del banco.
   */
  private isTransfer(bankMovement: Movement): boolean {
    const concept = (bankMovement.concept ?? '').trim().toLowerCase();
    return TRANSFER_CONCEPTS.some(
      (transferConcept) => transferConcept.toLowerCase() === concept,
    );
  }

  /**
   * Busca, entre los candidatos del sistema, un GRUPO de movimientos que
   * compartan el mismo 'number' (orden de pago / comprobante) cuya suma
   * caiga dentro de la tolerancia de monto contra el movimiento de banco.
   * Cubre el caso de una transferencia bancaria que agrupa varias líneas
   * de pago del sistema (ej: 2 facturas pagadas en una sola transferencia).
   *
   * Solo se agrupan movimientos con 'number' no vacío: un number vacío no
   * es un identificador real y agruparía movimientos no relacionados entre sí.
   */
  private findGroupMatch(
    bankMovement: Movement,
    candidates: Movement[],
  ): Movement[] | null {
    // Solo agrupamos candidatos del mismo signo que el banco: un grupo no
    // debería mezclar cobros y pagos para sumar "casualmente" el monto correcto.
    const sameSignCandidates = candidates.filter(
      (c) => Math.sign(c.amount) === Math.sign(bankMovement.amount),
    );

    const byNumber = new Map<string, Movement[]>();

    for (const candidate of sameSignCandidates) {
      const key = candidate.number?.trim();
      if (!key) continue;

      const group = byNumber.get(key) ?? [];
      group.push(candidate);
      byNumber.set(key, group);
    }

    for (const group of byNumber.values()) {
      // Un grupo de tamaño 1 ya se hubiese resuelto en el matching 1-a-1;
      // si llegó hasta acá sin matchear, sumarlo solo no va a cambiar nada.
      if (group.length < 2) continue;

      const groupTotal = group.reduce((sum, m) => sum + m.amount, 0);

      if (this.isWithinAmountTolerance(bankMovement.amount, groupTotal)) {
        return group;
      }
    }

    return null;
  }

  /**
   * Busca, entre los candidatos del sistema, el mejor match para un movimiento
   * de banco: monto dentro de la tolerancia porcentual y, si hay varios
   * candidatos válidos, el de monto más cercano al exacto.
   */
  private findBestMatch(
    bankMovement: Movement,
    candidates: Movement[],
  ): Movement | null {
    const withinTolerance = candidates.filter((systemMovement) =>
      this.isWithinAmountTolerance(bankMovement.amount, systemMovement.amount),
    );

    if (withinTolerance.length === 0) {
      return null;
    }

    if (withinTolerance.length === 1) {
      return withinTolerance[0];
    }

    return this.pickClosestByAmount(bankMovement, withinTolerance);
  }

  /**
   * Compara montos con tolerancia porcentual, EXIGIENDO que tengan el mismo
   * signo. Un movimiento de banco positivo (cobro/crédito) nunca puede
   * matchear con uno de sistema negativo (pago) y viceversa -- sin este
   * chequeo, dos movimientos de magnitud similar pero signo opuesto podían
   * "matchear" solo por casualidad numérica, produciendo conciliaciones
   * sin sentido (ej: un cobro DEBIN contra una orden de pago).
   */
  private isWithinAmountTolerance(bankAmount: number, systemAmount: number): boolean {
    const bankAbs = Math.abs(bankAmount);
    const systemAbs = Math.abs(systemAmount);

    if (bankAbs === 0 && systemAbs === 0) {
      return true;
    }

    if (Math.sign(bankAmount) !== Math.sign(systemAmount)) {
      return false;
    }

    const diff = Math.abs(bankAbs - systemAbs);
    const reference = Math.max(bankAbs, systemAbs);

    return diff / reference <= AMOUNT_TOLERANCE_PERCENTAGE;
  }

  /**
   * Desempata por monto más cercano al exacto. Cuando hay varios candidatos
   * dentro de la tolerancia, prioriza el que minimiza la diferencia absoluta
   * de monto contra el banco, en vez de la fecha más cercana -- la fecha de
   * carga en el sistema no es confiable como criterio de desempate porque
   * casi nunca coincide con la fecha real de acreditación bancaria.
   */
  private pickClosestByAmount(
    bankMovement: Movement,
    candidates: Movement[],
  ): Movement {
    const bankAbs = Math.abs(bankMovement.amount);

    return candidates.reduce((closest, current) => {
      const currentDiff = Math.abs(Math.abs(current.amount) - bankAbs);
      const closestDiff = Math.abs(Math.abs(closest.amount) - bankAbs);

      return currentDiff < closestDiff ? current : closest;
    }, candidates[0]);
  }

  private async markMatched(movement: Movement, reconciliationId: string): Promise<void> {
    if (!movement._id) {
      throw new Error('Movement sin _id, no se puede marcar como MATCHED');
    }
    await this.movementRepository.update({
      ...movement,
      status: 'MATCHED',
      reconciliationId,
    });
  }

  private async updateStatus(movement: Movement, status: string): Promise<void> {
    if (!movement._id) {
      throw new Error(
        `Movement sin _id, no se puede actualizar status a ${status}`,
      );
    }
    await this.movementRepository.updateStatus(movement._id.toString(), status);
  }

 
}
