import { Injectable } from '@nestjs/common';
import { MovementRepository } from 'src/domain/repositories/movement.repository';

@Injectable()
export class GetReconciliationResultsUseCase {
  constructor(
    private readonly movementRepository: MovementRepository,
  ) {}

  async execute(status?: string) {
    const movements = await this.movementRepository.findByStatus(status);

    return {
      total: movements.length,
      items: movements,
    };
  }
}