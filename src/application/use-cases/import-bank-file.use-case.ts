import { MovementRepository } from "src/domain/repositories/movement.repository";
import type { Express } from 'express';
import * as XLSX from 'xlsx';
import { BankExcelRowDto } from "../dto/bank.excel.row.dto";
import { parseAmount, parseExcelDate } from "../helper/excel.date.to.jsdate";
export class ImportBankFileUseCase {
  constructor(
      private readonly movementRepository: MovementRepository,
  ) {}

  async execute(file: Express.Multer.File) {
    console.log(file.originalname);
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<BankExcelRowDto>(sheet, {
  raw: false,
  dateNF: 'yyyy-mm-dd',
});

const movements = rows.map((row) => ({
  source: 'bank',
  company: row['Emp.'],
  date: parseExcelDate(row['Fecha Extracto']),
  documentDate: parseExcelDate(row['Fecha Documento']),
  clientOrProvider: row['Proveedor o Cliente'],
  document: row.Documento,
  number: row.Numero,
  currency: row.Moneda,
  description: row.Descripción,
  amount: parseAmount(row['Totales M. Local']),
  status: 'PENDING',
}));

await this.movementRepository.saveMany(movements);

    return {
      fileName: file.originalname,
      size: file.size,
      rowsPreview: rows.slice(0, 5),
    };
  }
}


