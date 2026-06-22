import { Controller, Get, Post, Query } from '@nestjs/common';
import { ConciliateMovementsUseCase } from 'src/application/use-cases/conciliate-movements.use-case';
import { GetBalanceReportUseCase } from 'src/application/use-cases/get-balance-report.UseCase';
import {
  GetReconciliationResultsUseCase,
  ReconciliationResults,
} from 'src/application/use-cases/get-reconciliation-results.use-case';


@Controller('reconciliation')
export class ReconciliationController {
  constructor(
    private readonly conciliateMovementsUseCase: ConciliateMovementsUseCase,
    private readonly getReconciliationResultsUseCase: GetReconciliationResultsUseCase,
    private readonly getBalanceReportUseCase: GetBalanceReportUseCase,
  ) {}

  @Post('run')
  async run(
    @Query('bankCode') bankCode: string,
    @Query('bankAccount') bankAccount: string,
    @Query('period') period: string,
  ) {
    const data = await this.conciliateMovementsUseCase.execute(
      bankCode,
      bankAccount,
      period,
    );

    return {
      message: 'Reconciliation finished successfully',
      data,
    };
  }

  @Get('results')
  async results(
    @Query('bankCode') bankCode: string,
    @Query('bankAccount') bankAccount: string,
    @Query('period') period: string,
  ): Promise<{ message: string; data: ReconciliationResults }> {
    const data = await this.getReconciliationResultsUseCase.execute(
      bankCode,
      bankAccount,
      period,
    );

    return {
      message: 'Reconciliation results retrieved successfully',
      data,
    };
  }

  @Get('balance')
  async balance(
    @Query('bankCode') bankCode: string,
    @Query('bankAccount') bankAccount: string,
    @Query('period') period: string,
  ) {
    const data = await this.getBalanceReportUseCase.execute(
      bankCode,
      bankAccount,
      period,
    );

    return {
      message: 'Balance report retrieved successfully',
      data,
    };
  }
}