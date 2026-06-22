import { BadRequestException, Injectable } from '@nestjs/common';
import { Movement } from 'src/domain/entities/movement.entity';
import { MovementRepository } from 'src/domain/repositories/movement.repository';
import { TRANSFER_CONCEPTS } from 'src/config/reconciliation.config';

export interface BalanceReport {
  bankCode: string;
  bankAccount: string;
  period: string;

  /**
   * Neto de los movimientos de banco que SÍ participan de la conciliación
   * (transferencias, según TRANSFER_CONCEPTS). No incluye impuestos,
   * comisiones, IVA, etc. -- esos movimientos nunca tienen contraparte en
   * el sistema (el sistema solo registra pagos/transferencias), así que
   * incluirlos acá rompería la comparación contra systemNetMovement.
   */
  bankNetMovement: number;

  /**
   * Suma de los movimientos de banco que NO son transferencia (impuestos,
   * comisiones, IVA, depósitos en efectivo, etc.). Se reporta aparte para
   * que no se pierda de vista, pero no entra en la comparación de neto
   * contra el sistema.
   */
  bankNonTransferMovement: number;

  /**
   * Neto de movimientos del sistema en el período. El sistema no expone
   * un saldo bancario propio, así que esto es la suma de los amount
   * registrados — comparable con bankNetMovement porque ambos son deltas
   * del mismo período y del mismo universo (transferencias/pagos).
   */
  systemNetMovement: number;

  /**
   * Suma de los movimientos de banco (transferencias) que no encontraron
   * contraparte en el sistema: el banco ya los procesó pero el sistema
   * todavía no los registró.
   */
  pendingBankOnly: number;
  /**
   * Suma de los movimientos de sistema que no encontraron contraparte en
   * el banco: el sistema ya los registró pero el banco todavía no los
   * procesó (ej: una orden de pago emitida pero no acreditada aún).
   */
  pendingSystemOnly: number;

  /** bankNetMovement - pendingBankOnly: el neto de banco, descontando lo que el banco ya tiene pero el sistema no. */
  bankNetAdjusted: number;
  /** systemNetMovement - pendingSystemOnly: el neto de sistema, descontando lo que el sistema ya tiene pero el banco no. */
  systemNetAdjusted: number;

  /**
   * bankNetAdjusted - systemNetAdjusted. Si la conciliación está completa
   * y correcta, debería ser ~0 (dentro de centavos de redondeo). Si no es
   * ~0, hay movimientos sin identificar de algún lado.
   */
  difference: number;
}

@Injectable()
export class GetBalanceReportUseCase {
  constructor(private readonly movementRepository: MovementRepository) {}

  async execute(
    bankCode: string,
    bankAccount: string,
    period: string,
  ): Promise<BalanceReport> {
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

    const bankTransfers = bankMovements.filter((m) => this.isTransfer(m));
    const bankNonTransfers = bankMovements.filter((m) => !this.isTransfer(m));

    const bankNetMovement = this.sumAmount(bankTransfers);
    const bankNonTransferMovement = this.sumAmount(bankNonTransfers);
    const systemNetMovement = this.sumAmount(systemMovements);

    const pendingBankOnly = this.sumAmount(
      bankTransfers.filter((m) => m.status === 'BANK_ONLY'),
    );
    const pendingSystemOnly = this.sumAmount(
      systemMovements.filter((m) => m.status === 'SYSTEM_ONLY'),
    );

    const bankNetAdjusted = this.round(bankNetMovement - pendingBankOnly);
    const systemNetAdjusted = this.round(systemNetMovement - pendingSystemOnly);

    return {
      bankCode,
      bankAccount,
      period,
      bankNetMovement,
      bankNonTransferMovement,
      systemNetMovement,
      pendingBankOnly,
      pendingSystemOnly,
      bankNetAdjusted,
      systemNetAdjusted,
      difference: this.round(bankNetAdjusted - systemNetAdjusted),
    };
  }

  private isTransfer(movement: Movement): boolean {
    const concept = (movement.concept ?? '').trim().toLowerCase();
    return TRANSFER_CONCEPTS.some((c) => c.toLowerCase() === concept);
  }

  private sumAmount(movements: Movement[]): number {
    return this.round(movements.reduce((sum, m) => sum + m.amount, 0));
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}