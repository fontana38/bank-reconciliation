import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Express } from 'express';
import * as XLSX from 'xlsx';

import { MovementRepository } from 'src/domain/repositories/movement.repository';
import { parseAmount, parseExcelDate } from '../helper/excel.date.to.jsdate';
import { BankExcelRowDto } from '../dto/bank.excel.row.dto';

@Injectable()
export class ImportSystemFileUseCase {
  private readonly logger = new Logger(ImportSystemFileUseCase.name);

  constructor(private readonly movementRepository: MovementRepository) {}

  async execute(
    file: Express.Multer.File,
    bankCode: string,
    bankAccount: string,
    period: string,
  ) {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('El archivo debe ser un Excel .xlsx o .xls');
    }

    if (!bankCode || !bankAccount || !period) {
      throw new BadRequestException('Debe informar bankCode, bankAccount y period');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<BankExcelRowDto>(sheet, {
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });

    if (!rows.length) {
      throw new BadRequestException('El archivo no contiene registros');
    }

    this.logger.debug(`Columnas sistema: ${Object.keys(rows[0]).join(', ')}`);

    const discardedRows: number[] = [];

    const movements = rows
      .map((row, index) => {
        const date = parseExcelDate(row['Fecha Documento'] ?? row['Fecha Extracto']);

        if (!date) {
          discardedRows.push(index + 1);
          this.logger.warn(`Fila sistema ${index + 1} sin fecha válida`);
          return null;
        }

        const amount = parseAmount(row['Totales M. Local']);

        return {
          source: 'system' as const,
          company: row['Emp.'],
          bankCode,
          bankAccount,
          period,
          date,
          documentDate: parseExcelDate(row['Fecha Documento']),
          clientOrProvider: row['Proveedor o Cliente'],
          document: row.Documento,
          number: String(row.Numero ?? ''),
          currency: row.Moneda,
          description: row.Descripción,
          normalizedDescription: row.Descripción?.trim().toLowerCase(),
          amount,
          status: 'PENDING',
        };
      })
      .filter((movement) => movement !== null);

    if (discardedRows.length > 0) {
      this.logger.warn(
        `Se descartaron ${discardedRows.length} fila(s) sin fecha válida: ${discardedRows.join(', ')}`,
      );
    }

    if (movements.length === 0) {
      throw new BadRequestException(
        'Ninguna fila del archivo pudo procesarse (revisar formato de fechas)',
      );
    }

    await this.movementRepository.saveMany(movements as any[]);

    return {
      fileName: file.originalname,
      size: file.size,
      bankCode,
      bankAccount,
      period,
      totalRows: rows.length,
      importedRows: movements.length,
      discardedRows: discardedRows.length,
      rowsPreview: rows.slice(0, 5),
    };
  }
}