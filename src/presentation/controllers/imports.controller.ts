import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';

import { ImportBankFileUseCase } from '../../application/use-cases/import-bank-file.use-case';
import { ImportSystemFileUseCase } from 'src/application/use-cases/import-system-file.use-case';

@Controller('imports')
export class ImportsController {
  constructor(
    private readonly importBankFileUseCase: ImportBankFileUseCase,
      private readonly importSystemFileUseCase: ImportSystemFileUseCase,
  ) {}

  @Post('bank')
  @UseInterceptors(FileInterceptor('file'))
  async importBankFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.importBankFileUseCase.execute(file);

    return {
      message: 'Bank file imported successfully',
      data: result,
    };
  }

   @Post('system')
  @UseInterceptors(FileInterceptor('file'))
  async importSystemFile(@UploadedFile() file: Express.Multer.File) {
    const data = await this.importSystemFileUseCase.execute(file);

    return {
      message: 'System file imported successfully',
      data,
    };
  }
}
