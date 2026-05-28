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

@Controller('imports')
export class ImportsController {
  constructor(
    private readonly importBankFileUseCase: ImportBankFileUseCase,
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
}