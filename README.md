<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
# Conciliación Bancaria — Documentación

Sistema para conciliar movimientos bancarios (extracto del banco) contra movimientos del sistema de gestión, identificando coincidencias automáticamente.

## Flujo general

```
1. POST /imports/bank     → carga el Excel del banco
2. POST /imports/system   → carga el Excel del sistema
3. POST /reconciliation/run     → corre el matching
4. GET  /reconciliation/results → ver el detalle (qué matcheó con qué)
5. GET  /reconciliation/balance → ver si la conciliación "cierra" en plata
```

Todos los endpoints requieren los mismos tres parámetros de contexto: `bankCode`, `bankAccount`, `period` (formato `YYYY-MM`).

---

## Endpoints

### `POST /imports/bank`

Importa el Excel del banco (formato Supervielle) y guarda cada fila como un `Movement` con `source: 'bank'` y `status: 'PENDING'`.

**Query params:** `bankCode`, `bankAccount`, `period`
**Body:** `form-data`, key `file` (Excel `.xlsx`/`.xls`)

**Respuesta:**
```json
{
  "fileName": "...",
  "totalRows": 14,
  "importedRows": 14,
  "discardedRows": 0,
  "rowsPreview": [...]
}
```

### `POST /imports/system`

Igual que el anterior, pero para el Excel del sistema de gestión. Guarda cada fila con `source: 'system'`.

### `POST /reconciliation/run`

Corre el algoritmo de matching (ver [Reglas de matching](#reglas-de-negocio--matching-conciliación) abajo) y actualiza el `status` de cada movimiento en la base.

**Respuesta:**
```json
{
  "totalBank": 14,
  "bankExcludedNonTransfer": 12,
  "totalBankTransfers": 2,
  "totalSystem": 4,
  "matched": 2,
  "matchedAsGroup": 1,
  "bankOnly": 0,
  "systemOnly": 1
}
```

### `GET /reconciliation/results`

Reporte detallado: reconstruye qué movimiento de banco matcheó con cuál (o cuáles) de sistema, y lista lo que quedó pendiente de cada lado.

**Respuesta (forma resumida):**
```json
{
  "summary": {
    "bank":   { "total": 14, "matched": 2, "unmatched": 0, "totalAmount": ..., "matchedAmount": ..., "unmatchedAmount": ... },
    "system": { "total": 4,  "matched": 3, "unmatched": 1, "totalAmount": ..., "matchedAmount": ..., "unmatchedAmount": ... }
  },
  "matchedGroups": [
    {
      "reconciliationId": "uuid",
      "bank": { "_id", "date", "concept", "description", "amount", "status", ... },
      "system": [ { ... }, { ... } ],
      "bankAmount": -488147.08,
      "systemAmount": -488147.05,
      "difference": -0.03,
      "isGroup": true
    }
  ],
  "bankOnly": [...],
  "systemOnly": [...],
  "bankExcludedFromMatching": [...]
}
```

Cada movimiento en la respuesta usa una forma "limpia" (`MovementReportItem`): solo expone `_id, source, date, concept, description, clientOrProvider, document, number, amount, status` — sin campos de infraestructura de Mongoose (`__v`, `createdAt`, `updatedAt`) ni otros que no aportan al usuario (`documentDate`, `currency`, `company`, `normalizedDescription`).

### `GET /reconciliation/balance`

Reporte numérico: compara el neto de movimientos de banco contra el neto de sistema, y muestra si la diferencia residual es aceptable (solo redondeo) o si quedan partidas sin explicar.

**Respuesta:**
```json
{
  "bankNetMovement": -738147.08,
  "bankNonTransferMovement": -86707.22,
  "systemNetMovement": -824854.27,
  "pendingBankOnly": 0,
  "pendingSystemOnly": -86707.22,
  "bankNetAdjusted": -738147.08,
  "systemNetAdjusted": -738147.05,
  "difference": -0.03
}
```

Ver [Reglas del reporte de saldos](#reglas-de-negocio--reporte-de-saldos-balance) para el detalle de cada campo.

---

## Reglas de negocio — Import de banco

- Solo acepta `.xlsx` / `.xls`.
- **`amount`** = `Crédito − Débito` (un solo campo con signo: positivo = ingreso, negativo = egreso).
- **`concept`** = columna `Concepto` tal cual, usado para filtrar por tipo de movimiento.
- **`description`** = `Detalle` si no está vacío, sino `Concepto` — pensado para mostrar al usuario (puede traer texto largo, ej. datos de CBU/CUIT en transferencias).
- **`date`** = `Fecha` + `Hora` combinadas, siempre construida en UTC explícito. Esto evita que el timezone del servidor (ej. `America/Argentina/Buenos_Aires`, UTC-3) corra la fecha al día anterior.
- **`balance`** = columna `Saldo`, guardado tal cual (no se usa en los reportes actuales; queda disponible para un futuro cálculo de saldo inicial real).
- **`rowIndex`** = posición original de la fila en el Excel, usado como desempate de orden cuando fecha y hora coinciden.
- Formatos de fecha soportados: `DD/MM/YYYY`, `DD-MM-YYYY`, ISO `YYYY-MM-DD`.
- Formatos de monto soportados: AR (`1.234,56`) y US (`1,234.56`), detectado automáticamente por la posición relativa del último `.`/`,`.
- Filas sin fecha válida se descartan individualmente (reportadas en `discardedRows`), sin abortar el import completo.

## Reglas de negocio — Import de sistema

- Mismas reglas de parseo de fecha/monto que el de banco.
- **`amount`** = columna `Totales M. Local` (ya viene con signo desde el sistema).
- **`date`** = `Fecha Documento` (o `Fecha Extracto` si la primera falta).
- **`clientOrProvider`**, **`document`**, **`number`** (orden de pago / comprobante) se guardan tal cual, sin transformación.

## Reglas de negocio — Matching (conciliación)

1. **Filtro de transferencias**: del lado del banco, solo entran al matching los movimientos cuyo `concept` esté en esta lista (`reconciliation.config.ts`):
   - `Transferencia por CBU`
   - `Trf. Masivas Pago Proveedores`
   - `Crédito por Transferencia`
   - `Debito Transf. HomeBanking`
   - `CRED BCA ELECTRONICA INTERBANC`
   - `Credito DEBIN`

   Todo lo demás (impuestos, IVA, comisiones, depósitos en efectivo, percepciones) queda fuera del matching y se reporta en `bankExcludedFromMatching`.

2. **Pasada 1 — Matching 1 a 1**: para cada transferencia de banco, se buscan movimientos de sistema cuyo monto esté dentro de una **tolerancia porcentual** (`AMOUNT_TOLERANCE_PERCENTAGE`, default 1%). Si hay un solo candidato, es el match. Si hay varios, se desempata por **fecha más cercana** a la del banco (no es un filtro excluyente, solo desempate).

3. **Pasada 2 — Matching 1 a N (agrupado)**: para las transferencias de banco que no encontraron match en la pasada 1, se agrupan los movimientos de sistema restantes por **`number`** (orden de pago / comprobante) y se prueba si la **suma del grupo** cae dentro de la tolerancia. Cubre el caso real de una transferencia bancaria que paga varias facturas/líneas juntas bajo el mismo número de orden de pago.

4. Lo que no matchea de ningún lado (ni 1 a 1 ni agrupado) queda como `BANK_ONLY` o `SYSTEM_ONLY`.

5. Cada match (simple o grupal) recibe un **`reconciliationId`** común (UUID), persistido en todos los movimientos involucrados. Esto permite reconstruir después, en el reporte, qué movimientos se agruparon entre sí.

### Pendiente / fuera de alcance actual

- El matching agrupado solo agrupa del lado del **sistema** (N sistema → 1 banco). No está soportado el caso inverso (N banco → 1 sistema).
- No hay desambiguación automática cuando dos movimientos de sistema matchean igual de bien contra el mismo banco más allá de la fecha más cercana — no se marca como "posible duplicado a revisar".

## Reglas de negocio — Reporte de saldos (`/balance`)

La comparación se hace en términos de **neto del período**, no de saldo absoluto — así se evita depender de un saldo inicial (cierre del período anterior) que hoy no se carga.

| Campo | Significado |
|---|---|
| `bankNetMovement` | Suma de **solo las transferencias** de banco (lo único comparable contra el sistema) |
| `bankNonTransferMovement` | Suma de lo que el banco cobra/paga que no es transferencia (impuestos, comisiones, IVA) — informativo, no entra en la comparación |
| `systemNetMovement` | Suma de todos los movimientos de sistema del período |
| `pendingBankOnly` | Suma de transferencias de banco sin contraparte en sistema |
| `pendingSystemOnly` | Suma de movimientos de sistema sin contraparte en banco |
| `bankNetAdjusted` | `bankNetMovement − pendingBankOnly` |
| `systemNetAdjusted` | `systemNetMovement − pendingSystemOnly` |
| `difference` | `bankNetAdjusted − systemNetAdjusted`. Si la conciliación está completa, debería ser ~0 (margen de centavos por redondeo en matches agrupados) |

**Por qué solo transferencias en `bankNetMovement`**: el sistema de gestión únicamente registra pagos/transferencias a proveedores, nunca movimientos internos del banco (impuestos, comisiones). Si se incluyeran esos movimientos en la comparación, la diferencia nunca cerraría aunque la conciliación esté perfecta — por eso se separan en `bankNonTransferMovement`.

---

## Entidad `Movement` — campos relevantes

| Campo | Origen | Uso |
|---|---|---|
| `_id` | Mongo (`ObjectId` como string) | Identificador |
| `source` | `'bank' \| 'system'` | De qué archivo viene |
| `bankCode`, `bankAccount`, `period` | Parámetros del import | Filtro de contexto |
| `amount` | Calculado en el import | Monto con signo |
| `date` | Calculado en el import | Fecha (+hora si es banco) |
| `concept` | `Concepto` (banco) | Filtro de transferencias |
| `description` | `Detalle`/`Concepto` (banco) o `Descripción` (sistema) | Texto para mostrar |
| `clientOrProvider` | `Proveedor o Cliente` (sistema) | Identificación de la contraparte |
| `number` | `Numero` (sistema) | Clave de agrupamiento 1-a-N |
| `balance` | `Saldo` (banco) | Reservado para saldo inicial futuro |
| `status` | `PENDING \| MATCHED \| BANK_ONLY \| SYSTEM_ONLY` | Estado de conciliación |
| `reconciliationId` | Generado al conciliar | Agrupa los movimientos de un mismo match |

---

## Bugs corregidos durante el desarrollo (referencia histórica)

| Bug | Causa | Fix |
|---|---|---|
| Matching exacto sin tolerancia | `===` en vez de comparación con margen | Tolerancia porcentual configurable |
| `(movement as any)._id` | Mismatch `id` (entity) vs `_id` (Mongo) | Entity usa `_id` directamente |
| Filtro de transferencias no filtraba nada | Comparaba contra `description` (mezclado con `Detalle`) | Campo `concept` separado |
| `concept` no se guardaba en Mongo | Faltaba `@Prop()` en el schema | Agregado al schema |
| Fechas `DD-MM-YYYY` se perdían o invertían día/mes | Parser solo soportaba `DD/MM/YYYY` | Branch explícito para guion |
| Corrimiento de día por timezone del servidor | `new Date(string)` en UTC medianoche | Todas las fechas se construyen en UTC explícito (mediodía o con hora real) |
| No soportaba 1 banco ↔ N sistema | No existía esa lógica | Agrupamiento por `number` en segunda pasada |
| Reporte de saldo no cerraba nunca | Comparaba saldo absoluto del banco vs. neto de sistema (magnitudes no comparables) | Se cambió a comparar netos del período, excluyendo del banco lo que no es transferencia |
