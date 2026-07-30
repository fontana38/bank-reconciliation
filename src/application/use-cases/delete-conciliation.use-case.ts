import { Injectable } from "@nestjs/common";
import { DeleteResult } from "mongoose";
import { MovementRepository } from "src/domain/repositories/movement.repository";

@Injectable()
export class DeleteConciliationUseCase {
  constructor(
    private readonly movementRepository: MovementRepository,
  ) {}

  execute(): Promise<DeleteResult> {
    console.log('DeleteConciliationUseCase.execute called');
    return this.movementRepository.deleteConciliation();
  }
}