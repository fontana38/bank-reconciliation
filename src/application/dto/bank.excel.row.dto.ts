export interface BankExcelRowDto {
  'Emp.': string;
  'Fecha Extracto': number | string | Date;
  'Fecha Documento': number | string | Date;
  'Proveedor o Cliente': string;
  Documento: string;
  Numero: number;
  Moneda: string;
  Descripción: string;
  'Entrada M. Local'?: number;
  'Salida M. Local'?: number;
  'Totales M. Local'?: number;
  'Fecha Conciliación'?: number | string | Date;
}