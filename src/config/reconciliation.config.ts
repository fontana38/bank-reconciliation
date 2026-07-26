/**
 * Conceptos del banco que se consideran "transferencia" a efectos de conciliación.
 * Cualquier movimiento de banco cuyo concepto no esté en esta lista
 * (impuestos, comisiones, depósitos en efectivo, etc.) se ignora del matching.
 */
export const TRANSFER_CONCEPTS: readonly string[] = [
  'Transferencia por CBU',
  'Trf. Masivas Pago Proveedores',
  'Crédito por Transferencia',
  'Debito Transf. HomeBanking',
  'CRED BCA ELECTRONICA INTERBANC',
  'Credito DEBIN',
  'Pago de Servicios',
  'Depósito EN EFECTIVO',
];

/**
 * Tolerancia porcentual permitida entre el monto del banco y el monto del sistema
 * para considerarlos un posible match. 0.01 = 1%.
 */
export const AMOUNT_TOLERANCE_PERCENTAGE = 0.01;