/**
 * Construye una fecha en UTC al mediodía (12:00) para el día/mes/año dados.
 * Usar mediodía (no medianoche) evita que un timezone con offset (ej. UTC-3)
 * la corra al día anterior al convertir a hora local en cualquier punto del
 * código que llame getDate()/getMonth() o que la formatee.
 */
function buildUtcDate(year: number, month1based: number, day: number): Date {
  return new Date(Date.UTC(year, month1based - 1, day, 12, 0, 0));
}

export function parseExcelDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    // Re-normalizamos a UTC mediodía por si el Date original viene con hora
    // arbitraria (ej. medianoche local), para mantener un único criterio.
    return buildUtcDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );
  }

  if (typeof value === 'number') {
    // Número de serie de Excel: días desde 1899-12-30 (epoch de Excel).
    const excelEpochMs = Date.UTC(1899, 11, 30, 12, 0, 0);
    const ms = excelEpochMs + value * 24 * 60 * 60 * 1000;
    return new Date(ms);
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    // Formato DD/MM/YYYY o DD/MM/YY
    const slashParts = trimmedValue.split('/');
    if (slashParts.length === 3) {
      const day = Number(slashParts[0]);
      const month = Number(slashParts[1]);
      let year = Number(slashParts[2]);

      if (year < 100) year += 2000;

      if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
        return buildUtcDate(year, month, day);
      }
    }

    // Formato DD-MM-YYYY o DD-MM-YY (guion). Importante: se chequea ANTES
    // del fallback genérico, porque new Date("30-04-2026") da Invalid Date,
    // y new Date("01-04-2026") da una fecha VÁLIDA pero con día/mes invertidos
    // (la interpreta como YYYY-MM-DD). Sin este branch, las fechas con día <= 12
    // quedan mal guardadas sin ningún error, y las fechas con día > 12 se pierden.
    const dashMatch = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(trimmedValue);
    if (dashMatch) {
      const [, dayStr, monthStr, yearStr] = dashMatch;
      const day = Number(dayStr);
      const month = Number(monthStr);
      const year = Number(yearStr);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return buildUtcDate(year, month, day);
      }
    }

    // Formato YYYY-MM-DD (el que produce xlsx con dateNF: 'yyyy-mm-dd')
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmedValue);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return buildUtcDate(Number(year), Number(month), Number(day));
    }

    // Último recurso: dejar que Date lo interprete, pero normalizando
    // igual a UTC mediodía a partir de los componentes UTC resultantes.
    const fallbackDate = new Date(trimmedValue);
    if (!Number.isNaN(fallbackDate.getTime())) {
      return buildUtcDate(
        fallbackDate.getUTCFullYear(),
        fallbackDate.getUTCMonth() + 1,
        fallbackDate.getUTCDate(),
      );
    }
  }

  return null;
}

/**
 * Combina una fecha (ya parseada por parseExcelDate, en UTC mediodía) con una
 * hora en formato "HH:mm", para reconstruir el instante real del movimiento.
 * Necesario para poder ordenar movimientos de un mismo día por hora real
 * (ej: determinar cuál es el "último" movimiento del banco en una fecha
 * con varias transacciones, para el saldo de cierre).
 *
 * Si timeStr no es válido, devuelve la fecha original sin modificar (sigue
 * siendo UTC mediodía, comportamiento de fallback seguro).
 */
export function combineDateAndTime(date: Date, timeStr: unknown): Date {
  if (typeof timeStr !== 'string') return date;

  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!match) return date;

  const [, hoursStr, minutesStr] = match;
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return date;

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours,
      minutes,
      0,
    ),
  );
}

/**
 * Parsea un monto que puede venir como:
 * - number nativo (ya parseado por la librería xlsx)
 * - string formato US: "1,234.56" (coma miles, punto decimal)
 * - string formato AR: "1.234,56" (punto miles, coma decimal)
 *
 * Detecta el formato por la posición relativa del último '.' y la última ','.
 */
export function parseAmount(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;

  if (typeof value === 'number') return value;

  const trimmed = value.trim();
  const lastDot = trimmed.lastIndexOf('.');
  const lastComma = trimmed.lastIndexOf(',');

  let normalized: string;

  if (lastComma > lastDot) {
    // Formato AR: el separador decimal es la coma (la última que aparece).
    // "1.234.567,89" -> quitar puntos, cambiar coma por punto.
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Formato US: el separador decimal es el punto.
    // "1,234,567.89" -> quitar comas.
    normalized = trimmed.replace(/,/g, '');
  } else {
    // No hay separador de miles, solo dígitos (y posible signo).
    normalized = trimmed;
  }

  const result = Number(normalized);
  return Number.isNaN(result) ? 0 : result;
}