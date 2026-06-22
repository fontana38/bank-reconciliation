import { BadRequestException, Injectable } from '@nestjs/common';
import { Movement } from 'src/domain/entities/movement.entity';
import { MovementRepository } from 'src/domain/repositories/movement.repository';

/**
 * Forma "limpia" de un movimiento para mostrar en el reporte, sin los campos
 * de infraestructura de Mongoose (__v, createdAt, updatedAt) ni los que no
 * aportan valor al usuario en este contexto (documentDate, currency, company,
 * normalizedDescription, reconciliationId -- este último ya queda implícito
 * en el agrupamiento de matchedGroups).
 */
export interface MovementReportItem {
  _id?: string;
  source: 'bank' | 'system';
  date: Date | null;
  concept?: string;
  description?: string;
  clientOrProvider?: string;
  document?: string;
  number?: string;
  amount: number;
  status?: string;
}

function toReportItem(movement: Movement): MovementReportItem {
  return {
    _id: movement._id,
    source: movement.source,
    date: movement.date,
    concept: movement.concept,
    description: movement.description,
    clientOrProvider: movement.clientOrProvider,
    document: movement.document,
    number: movement.number,
    amount: movement.amount,
    status: movement.status,
  };
}

export interface SideSummary {
  total: number;
  matched: number;
  unmatched: number;
  totalAmount: number;
  matchedAmount: number;
  unmatchedAmount: number;
}

export interface MatchedGroup {
  reconciliationId: string;
  bank: MovementReportItem;
  system: MovementReportItem[];
  bankAmount: number;
  systemAmount: number;
  /** Diferencia entre el monto del banco y la suma del sistema (debería ser ~0, dentro de la tolerancia configurada). */
  difference: number;
  isGroup: boolean;
}

export interface ReconciliationResults {
  bankCode: string;
  bankAccount: string;
  period: string;
  summary: {
    bank: SideSummary;
    system: SideSummary;
  };
  matchedGroups: MatchedGroup[];
  bankOnly: MovementReportItem[];
  systemOnly: MovementReportItem[];
  bankExcludedFromMatching: MovementReportItem[];
}

@Injectable()
export class GetReconciliationResultsUseCase {
  constructor(private readonly movementRepository: MovementRepository) {}

  async execute(
    bankCode: string,
    bankAccount: string,
    period: string,
  ): Promise<ReconciliationResults> {
    if (!bankCode || !bankAccount || !period) {
      throw new BadRequestException('Debe informar bankCode, bankAccount y period');
    }

    const movements = await this.movementRepository.findByAccountAndPeriod(
      bankCode,
      bankAccount,
      period,
    );

    const bankMovements = movements.filter((m) => m.source === 'bank');
    const systemMovements = movements.filter((m) => m.source === 'system');

    const matchedGroups = this.buildMatchedGroups(bankMovements, systemMovements);

    const bankOnly = bankMovements.filter((m) => m.status === 'BANK_ONLY');
    const systemOnly = systemMovements.filter((m) => m.status === 'SYSTEM_ONLY');
    const bankExcluded = bankMovements.filter(
      (m) => m.status !== 'MATCHED' && m.status !== 'BANK_ONLY',
    );

    return {
      bankCode,
      bankAccount,
      period,
      summary: {
        bank: this.buildSideSummary(bankMovements, 'MATCHED', 'BANK_ONLY'),
        system: this.buildSideSummary(systemMovements, 'MATCHED', 'SYSTEM_ONLY'),
      },
      matchedGroups,
      bankOnly: bankOnly.map(toReportItem),
      systemOnly: systemOnly.map(toReportItem),
      // Movimientos de banco que no son transferencia (excluidos del matching
      // por ConciliateMovementsUseCase) y siguen PENDING: ni concilian ni se
      // marcan como pendiente de revisión, así que se reportan aparte para
      // que no se pierdan de vista del todo.
      bankExcludedFromMatching: bankExcluded.map(toReportItem),
    };
  }

  /**
   * Agrupa los movimientos MATCHED por reconciliationId, reconstruyendo
   * qué movimiento de banco corresponde a qué movimiento(s) de sistema.
   * Movimientos MATCHED sin reconciliationId (datos de una corrida anterior
   * al campo) se ignoran del agrupado para no romper el reporte.
   */
  private buildMatchedGroups(
    bankMovements: Movement[],
    systemMovements: Movement[],
  ): MatchedGroup[] {
    const matchedBank = bankMovements.filter(
      (m) => m.status === 'MATCHED' && m.reconciliationId,
    );
    const matchedSystem = systemMovements.filter(
      (m) => m.status === 'MATCHED' && m.reconciliationId,
    );

    const systemByReconciliationId = new Map<string, Movement[]>();
    for (const s of matchedSystem) {
      const key = s.reconciliationId!;
      const group = systemByReconciliationId.get(key) ?? [];
      group.push(s);
      systemByReconciliationId.set(key, group);
    }

    return matchedBank.map((bank) => {
      const reconciliationId = bank.reconciliationId!;
      const system = systemByReconciliationId.get(reconciliationId) ?? [];
      const bankAmount = bank.amount;
      const systemAmount = system.reduce((sum, s) => sum + s.amount, 0);

      return {
        reconciliationId,
        bank: toReportItem(bank),
        system: system.map(toReportItem),
        bankAmount,
        systemAmount,
        difference: Math.round((bankAmount - systemAmount) * 100) / 100,
        isGroup: system.length > 1,
      };
    });
  }

  private buildSideSummary(
    movements: Movement[],
    matchedStatus: string,
    unmatchedStatus: string,
  ): SideSummary {
    const matched = movements.filter((m) => m.status === matchedStatus);
    const unmatched = movements.filter((m) => m.status === unmatchedStatus);

    return {
      total: movements.length,
      matched: matched.length,
      unmatched: unmatched.length,
      totalAmount: this.sumAmount(movements),
      matchedAmount: this.sumAmount(matched),
      unmatchedAmount: this.sumAmount(unmatched),
    };
  }

  private sumAmount(movements: Movement[]): number {
    const total = movements.reduce((sum, m) => sum + m.amount, 0);
    return Math.round(total * 100) / 100;
  }
}