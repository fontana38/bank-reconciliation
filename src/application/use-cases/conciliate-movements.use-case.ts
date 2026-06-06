import { Injectable } from '@nestjs/common';
import { Movement } from 'src/domain/entities/movement.entity';
import { MovementRepository } from 'src/domain/repositories/movement.repository';

@Injectable()
export class ConciliateMovementsUseCase {
  constructor(
    private readonly movementRepository: MovementRepository,
  ) {}

  async execute() {
    const bankMovements =
      await this.movementRepository.findPendingBySource('bank');

    const systemMovements =
      await this.movementRepository.findPendingBySource('system');

    let matched = 0;

    const bankOnly: Movement[] = [];
    const systemOnly: Movement[] = [...systemMovements];

    for (const bankMovement of bankMovements) {
      const matchIndex = systemOnly.findIndex((systemMovement) => {
        return Math.abs(systemMovement.amount) === Math.abs(bankMovement.amount);
      });

      if (matchIndex >= 0) {
        const systemMovement = systemOnly[matchIndex];

        await this.movementRepository.updateStatus(
          (bankMovement as any)._id.toString(),
          'MATCHED',
        );

        await this.movementRepository.updateStatus(
          (systemMovement as any)._id.toString(),
          'MATCHED',
        );

        systemOnly.splice(matchIndex, 1);
        matched++;
      } else {
        bankOnly.push(bankMovement);

        await this.movementRepository.updateStatus(
          (bankMovement as any)._id.toString(),
          'BANK_ONLY',
        );
      }
    }

    for (const systemMovement of systemOnly) {
      await this.movementRepository.updateStatus(
        (systemMovement as any)._id.toString(),
        'SYSTEM_ONLY',
      );
    }

    return {
      totalBank: bankMovements.length,
      totalSystem: systemMovements.length,
      matched,
      bankOnly: bankOnly.length,
      systemOnly: systemOnly.length,
    };
  }
}