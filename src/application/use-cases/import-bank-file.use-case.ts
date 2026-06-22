import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Express } from 'express';
import * as XLSX from 'xlsx';

import { MovementRepository } from 'src/domain/repositories/movement.repository';
import { parseAmount, parseExcelDate, combineDateAndTime } from '../helper/excel.date.to.jsdate';
import { SupervielleBankExcelRowDto } from '../dto/supervilleBankExcelRowDto';

@Injectable()
export class ImportBankFileUseCase {
  private readonly logger = new Logger(ImportBankFileUseCase.name);

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

    const rows = XLSX.utils.sheet_to_json<SupervielleBankExcelRowDto>(sheet, {
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });

    if (!rows.length) {
      throw new BadRequestException('El archivo no contiene registros');
    }

    this.logger.debug(`Columnas banco: ${Object.keys(rows[0]).join(', ')}`);

    const discardedRows: number[] = [];

    const movements = rows
      .map((row, index) => {
        const parsedDate = parseExcelDate(row.Fecha);

        if (!parsedDate) {
          discardedRows.push(index + 1);
          this.logger.warn(`Fila banco ${index + 1} con Fecha inválida: ${row.Fecha}`);
          return null;
        }

        // Combinamos fecha + hora real para poder ordenar correctamente
        // movimientos del mismo día (necesario para saber cuál es el
        // "último" movimiento del día y tomar su Saldo como saldo de cierre).
        const date = combineDateAndTime(parsedDate, row.Hora);

        const debit = parseAmount(row.Débito);
        const credit = parseAmount(row.Crédito);
        const balance = parseAmount(row.Saldo);

        // Concepto y Detalle son mutuamente excluyentes en la práctica:
        // Detalle suele venir vacío salvo en transferencias/IVA, donde trae
        // el texto largo de la operación. concept guarda SIEMPRE el Concepto
        // puro (para filtrar por tipo de movimiento); description guarda el
        // texto más descriptivo disponible (para mostrar al usuario).
        const concept = row.Concepto?.trim();
        const description = row.Detalle?.trim() || row.Concepto?.trim() || '';

        return {
          source: 'bank' as const,
          company: bankAccount,
          bankCode,
          bankAccount,
          period,
          date,
          documentDate: date,
          rowIndex: index,
          clientOrProvider: '',
          concept,
          document: concept ?? '',
          number: '',
          currency: 'ARS',
          description,
          normalizedDescription: description.toLowerCase(),
          amount: credit > 0 ? credit : debit * -1,
          balance,
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