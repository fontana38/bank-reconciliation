import { Controller, Get, Post, Query } from '@nestjs/common';
import { ConciliateMovementsUseCase } from 'src/application/use-cases/conciliate-movements.use-case';
import { GetReconciliationResultsUseCase } from 'src/application/use-cases/get-reconciliation-results.use-case';

@Controller('reconciliation')
export class ReconciliationController {
  constructor(
    private readonly conciliateMovementsUseCase: ConciliateMovementsUseCase,
    private readonly getReconciliationResultsUseCase: GetReconciliationResultsUseCase,
  ) {}

  @Post('run')
  async run() {
    const data = await this.conciliateMovementsUseCase.execute();

    return {
      message: 'Reconciliation finished successfully',
      data,
    };
  }

  @Get('results')
  async results(@Query('status') status?: string) {
    const data = await this.getReconciliationResultsUseCase.execute(status);

    return {
      message: 'Reconciliation results retrieved successfully',
      data,
    };
  }
}