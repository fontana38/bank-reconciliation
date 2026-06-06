export function parseExcelDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
    return excelEpoch;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    const parts = trimmedValue.split('/');

    if (parts.length === 3) {
      const day = Number(parts[0]);
      const month = Number(parts[1]);
      let year = Number(parts[2]);

      if (year < 100) {
        year += 2000;
      }

      const date = new Date(year, month - 1, day);

      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    const fallbackDate = new Date(trimmedValue);

    if (!Number.isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }
  }

  return null;
}

export function parseAmount(value: string | number | undefined): number {
  if (!value) return 0;

  if (typeof value === 'number') return value;

  return Number(value.replace(/,/g, ''));
}