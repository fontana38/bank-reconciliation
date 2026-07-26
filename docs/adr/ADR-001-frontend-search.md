# Banking Reconciliation System

## Objetivo

Automatizar la conciliación entre movimientos bancarios y movimientos del sistema.

---

## Decisiones de arquitectura

### ADR-001 - La búsqueda se realiza en el frontend

**Estado:** Aceptada

**Motivo**

- Solo existe una conciliación activa.
- No hay historial.
- No se requiere auditoría.
- La búsqueda es instantánea y evita llamadas innecesarias al backend.

**Consecuencia**

Si en el futuro se incorporan múltiples conciliaciones o millones de registros, la búsqueda podrá migrarse al backend.
## ADR-002 - Excluir conceptos bancarios no conciliables

**Decisión:**  
Solo algunos conceptos bancarios participan del matching.

**Motivo:**  
El extracto bancario contiene movimientos que no tienen equivalente directo en el sistema, como impuestos, IVA, comisiones o percepciones.

**Consecuencia:**  
Los movimientos excluidos no se consideran diferencias, sino que se reportan aparte como `bankExcludedFromMatching`.