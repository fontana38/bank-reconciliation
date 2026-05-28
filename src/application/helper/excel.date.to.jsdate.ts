export function parseExcelDate(value: string | number | Date | undefined): Date | null {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + value * 86400000);
  }

  const [month, day, year] = value.split('/').map(Number);

  if (!month || !day || !year) return null;

  const fullYear = year < 100 ? 2000 + year : year;

  return new Date(Date.UTC(fullYear, month - 1, day));
}

export function parseAmount(value: string | number | undefined): number {
  if (!value) return 0;

  if (typeof value === 'number') return value;

  return Number(value.replace(/,/g, ''));
}