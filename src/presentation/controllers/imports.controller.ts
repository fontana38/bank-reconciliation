import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Query ,
} from '@nestjs/common';


import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';

import { ImportBankFileUseCase } from '../../application/use-cases/import-bank-file.use-case';
import { ImportSystemFileUseCase } from 'src/application/use-cases/import-system-file.use-case';
import { ConciliateMovementsUseCase } from 'src/application/use-cases/conciliate-movements.use-case';
import { DeleteConciliationUseCase } from 'src/application/use-cases/delete-conciliation.use-case';


@Controller('imports')
export class ImportsController {
  constructor(
    private readonly importBankFileUseCase: ImportBankFileUseCase,
      private readonly importSystemFileUseCase: ImportSystemFileUseCase,
       private readonly deleteConciliationUseCase : DeleteConciliationUseCase,
  ) {}

  @Post('bank')
  @UseInterceptors(FileInterceptor('file'))
  async importBankFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('bankCode') bankCode: string,
  @Query('bankAccount') bankAccount: string,
  @Query('period') period: string,
    
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.importBankFileUseCase.execute(file, bankCode, bankAccount, period);

    return {
      message: 'Bank file imported successfully',
      data: result,
    };
  }

   @Post('system')
  @UseInterceptors(FileInterceptor('file'))
  async importSystemFile(@UploadedFile() file: Express.Multer.File,
 @Query('bankCode') bankCode: string,
    @Query('bankAccount') bankAccount: string,
    @Query('period') period: string,) {
    const data = await this.importSystemFileUseCase.execute(file, bankCode, bankAccount, period);

    return {
      message: 'System file imported successfully',
      data,
    };
  }

  @Post('delete-conciliation')
  async deleteConciliation() {
    console.log('deleteConciliation called');
    const data = await this.deleteConciliationUseCase.execute();
  
     return {
    message: 'Conciliation deleted successfully',
    deletedCount: data.deletedCount,
  };
  }
}
