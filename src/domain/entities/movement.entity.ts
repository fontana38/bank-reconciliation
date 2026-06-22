export class Movement {
  _id?: string;
  bankCode?: string;
  bankAccount?: string;
  batchId?: string;
  period?: string;
  source!: 'bank' | 'system';
  amount!: number;
  date!: Date | null;
  concept?: string;
  description?: string;
  normalizedDescription?: string;
  clientOrProvider?: string;
  document?: string;
  number?: string;
  /** Saldo del extracto bancario después de este movimiento (solo source: 'bank'). */
  balance?: number;
  /** Orden de aparición en el Excel original, usado como desempate de orden cuando la hora no es suficiente. */
  rowIndex?: number;
  status?: string;
  reconciliationId?: string;
}