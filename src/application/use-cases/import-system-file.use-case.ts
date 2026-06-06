import { BadRequestException, Injectable } from '@nestjs/common';
import type { Express } from 'express';
import * as XLSX from 'xlsx';

import { MovementRepository } from 'src/domain/repositories/movement.repository';
import { parseAmount, parseExcelDate } from '../helper/excel.date.to.jsdate';
import { BankExcelRowDto } from '../dto/bank.excel.row.dto';



@Injectable()
export class ImportSystemFileUseCase {
  constructor(
    private readonly movementRepository: MovementRepository,
   
  ) {}

  async execute(file: Express.Multer.File) {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('El archivo debe ser un Excel .xlsx o .xls');
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

    console.log('Columnas sistema:', Object.keys(rows[0]));
    console.log('Primera fila sistema:', rows[0]);

    const movements = rows
      .map((row, index) => {
        const date = parseExcelDate(row['Fecha Documento'] ?? row['Fecha Extracto']);

        if (!date) {
          console.error(`Fila sistema ${index + 1} sin fecha válida`, row);
          return null;
        }

        return {
          source: 'system',
          company: row['Emp.'],
          date,
          documentDate: parseExcelDate(row['Fecha Documento']),
          clientOrProvider: row['Proveedor o Cliente'],
          document: row.Documento,
          number: row.Numero,
          currency: row.Moneda,
          description: row.Descripción,
          normalizedDescription: row.Descripción,
          amount: parseAmount(row['Totales M. Local']),
          status: 'PENDING',
        };
      })
      .filter((movement) => movement !== null);

    await this.movementRepository.saveMany(movements as any[]);

    return {
      fileName: file.originalname,
      size: file.size,
      totalRows: rows.length,
      importedRows: movements.length,
      rowsPreview: rows.slice(0, 5),
    };
  }
}