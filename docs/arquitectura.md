# Arquitectura técnica

## 1. Stack

| Capa | Tecnología |
|------|------------|
| Framework | Angular 21 — **standalone components**, **zoneless** (`provideZonelessChangeDetection`), **signals** |
| Lenguaje | TypeScript 5.9, `strict` + `noPropertyAccessFromIndexSignature` + `strictTemplates` |
| UI | Angular Material 21 + CDK |
| Gráficos | Chart.js 4 vía `ng2-charts` 10 |
| Mapas | Leaflet 1.9 + `leaflet.heat` (heatmap) + `leaflet.markercluster` (clustering) |
| Datos (origen actual) | CSVs estáticos en `src/assets/data`, parseados con `papaparse` |
| Reactividad | RxJS 7.8 en la capa de datos; signals en la capa de vista |
| Build / CLI | `@angular/build:application` (esbuild) |
| Tests | Vitest 4 + jsdom (`@angular/build:unit-test`) |

El proyecto es **zoneless**: no hay Zone.js. La detección de cambios se dispara por
signals y por el `async` pipe. Por eso las páginas envuelven la fuente de datos en
`toSignal(...)` o se suscriben explícitamente con `takeUntilDestroyed()`.

## 2. Vista de alto nivel

```
                 ┌──────────────────────────────────────────────┐
                 │                  CAPA DE VISTA                │
                 │  AppComponent (shell: toolbar, nav, búsqueda) │
                 │  FilterBarComponent (filtro global)           │
                 │  8 páginas lazy (router-outlet)               │
                 │  KpiCardComponent · SucursalDetailDialog      │
                 └───────────────┬──────────────────────────────┘
                                 │ inyectan la abstracción
                                 ▼
                 ┌──────────────────────────────────────────────┐
                 │           DashboardSource (abstract)          │
                 │  state$ · data$ · filterOptions$ · activeFilter$
                 │  setFilter() · clearFilter() · reload()       │
                 │  searchSucursales() · getSucursal()           │
                 └───────────────┬──────────────────────────────┘
            useClass (app.config.ts)│
                ┌────────────────────┴───────────────────┐
                ▼                                         ▼
   ┌───────────────────────────┐          ┌───────────────────────────────┐
   │   CsvDashboardService      │          │   ApiDashboardService (stub)   │
   │   (ACTIVA)                 │          │   (plantilla backend)          │
   │   carga CSV → agrega       │          │   GET /api/dashboard?filtros   │
   │   en el cliente            │          │   el backend agrega (SQL)      │
   └────────────┬──────────────┘          └───────────────────────────────┘
                │ delega el cálculo
                ▼
   ┌───────────────────────────────────────────────────────┐
   │       services/aggregations/  (FUNCIONES PURAS)        │
   │  lookups · coords · filter · sucursal-rows ·           │
   │  sections · compute-dashboard                          │
   │  → producen un único DashboardData                     │
   └───────────────────────────────────────────────────────┘
```

El principio rector: **la UI depende de un contrato, no de una implementación**, y **el
cálculo está aislado en funciones puras**. Las dos decisiones permiten migrar de "agregar
en el navegador" a "agregar en el backend" cambiando una sola línea de configuración.

## 3. La fuente de datos abstracta (`DashboardSource`)

Definida en [`services/dashboard-source.ts`](../src/app/services/dashboard-source.ts).
Es una **clase abstracta** que actúa como token de inyección y como contrato. Todas las
páginas y componentes inyectan `DashboardSource`, nunca una clase concreta.

Expone cuatro observables y un puñado de comandos:

| Miembro | Tipo | Rol |
|---------|------|-----|
| `state$` | `Observable<DashboardState>` | Estado del *shell*: `loading` → `ready` \| `error`. |
| `data$` | `Observable<DashboardData>` | El dashboard completo ya computado; re-emite ante cada cambio de filtro. |
| `filterOptions$` | `Observable<FilterOptions>` | Provincias, regiones y estados para poblar el filtro. |
| `activeFilter$` | `Observable<DashboardFilter>` | Filtro global vigente. |
| `setFilter(patch)` / `clearFilter()` | comando | Mutan el filtro (patch parcial). |
| `hasActiveFilter` | getter | ¿Hay algún criterio activo? |
| `reload()` | comando | Reintenta la carga (p. ej. tras una falla transitoria). |
| `searchSucursales(term, limit?)` | método sync | Búsqueda libre (ignora el filtro). |
| `getSucursal(id)` | método sync | Una sucursal por id. |

El provider se elige en [`app.config.ts`](../src/app/app.config.ts):

```ts
{ provide: DashboardSource, useClass: CsvDashboardService }
```

> **Para migrar al backend**: reemplazar `CsvDashboardService` por `ApiDashboardService`.
> No se toca ni una página.

`DashboardData` es, además, **el contrato del DTO** que la API deberá devolver. Es decir:
el shape que hoy produce el agregador en el cliente es exactamente el que mañana producirá
el `GROUP BY`/`SUM`/`COUNT` del servidor.

## 4. Implementación activa: `CsvDashboardService`

[`services/csv-dashboard.service.ts`](../src/app/services/csv-dashboard.service.ts).
Es un **orquestador delgado**; no contiene lógica de cálculo. Sus responsabilidades:

1. **Cargar** los 15 CSVs relevantes en paralelo (`forkJoin` + `papaparse`).
2. **Memoizar** dos derivados invariantes tras la carga:
   - `lookups`: índices `id → nombre` (`buildLookups`), construidos **una sola vez**.
   - `allRows`: filas de detalle por sucursal (`buildSucursalRows`), construidas *lazy* y cacheadas.
3. **Reaccionar al filtro**: `combineLatest([ready$, filter$])` → `computeDashboard(...)`.

Pipeline reactivo:

```
reload$ ──switchMap──▶ loadAllCsv() ──▶ state$ (loading→ready|error, shareReplay)
                                          │
ready$ = state$.filter(ready)             │
                                          ▼
combineLatest([ready$, filter$]) ──map──▶ computeDashboard(raw, lookups, allRows, filter) ──▶ data$
```

Manejo de errores: `describeError()` traduce `HttpErrorResponse` a mensajes accionables en
español (distingue 404 "archivo no encontrado" del resto), que el shell muestra con botón
**Reintentar**.

## 5. Capa de agregación (funciones puras)

[`services/aggregations/`](../src/app/services/aggregations/) — el corazón del cálculo.
Todo son **funciones puras, sin estado, sin dependencias de Angular**, por lo tanto
trivialmente testeables. El barrel `index.ts` re-exporta todo.

| Archivo | Qué hace |
|---------|----------|
| `lookups.ts` | Define `RawData` (las 15 tablas crudas) y `Lookups` (9 mapas `id→nombre`). `buildLookups(raw)` los construye una vez. |
| `coords.ts` | `classifyCoord(lat, lng)` parsea y clasifica coordenadas contra `AR_BOUNDS`: válida / inválida (fuera de Argentina) / ausente. |
| `filter.ts` | `DashboardFilter`, `applyFilter(raw, lk, f)` → `FilteredData` (universo acotado por provincia/región/estado/rango de fechas, propagado en cascada). `rowMatches()` filtra filas ya construidas. |
| `sucursal-rows.ts` | `buildSucursalRows(raw, lk)` → lista completa de `SucursalRow` (detalle por sucursal, independiente del filtro → memoizable). |
| `sections.ts` | Un agregador por "sección" del dashboard: `computeBranchSummary`, `computeCompensaciones`, `computeMails`, `computeAuditoria`, `computeGeo`, `computeIssues`, `computeProvincias`, `computeSeries`, `computeErroresPorTipo`. Más el helper `pct()`. |
| `compute-dashboard.ts` | `computeDashboard(...)` orquesta todos los agregadores y ensambla el `DashboardData` final (incluye derivados cruzados como `scoreRiesgo`). |

### Flujo de `computeDashboard`

```
applyFilter(raw, lk, filtro) ──▶ FilteredData (fd)
   │
   ├─ computeBranchSummary(fd, lk)     → totales, activas/inactivas, cobertura
   ├─ computeCompensaciones(fd, lk)    → estados, aging, edad promedio  → compAbiertasBySuc
   ├─ computeMails(fd, lk)             → enviados/fallidos, por asunto   → mailsFallidosBySuc
   ├─ computeAuditoria(fd, lk)         → eventos por acción/mes/tabla
   ├─ computeGeo(fd, lk, ↑, ↑)         → puntos para el mapa (usa los dos Map de arriba)
   ├─ computeIssues(fd, lk)            → sucursales con problemas de calidad
   ├─ computeProvincias(fd, lk)        → agregado por provincia
   ├─ computeSeries(fd, lk)            → series mensuales + tendencias MoM
   └─ computeErroresPorTipo(fd, lk)    → conteo de errores
   │
   ├─ scoreRiesgo = 0.4·%mailsFallidos + 0.4·%compAbiertas + 0.2·%softDelete
   └─ sucursales = allRows.filter(rowMatches)   ← tabla de detalle filtrada
   ▼
   DashboardData
```

> **Regla de oro**: no volver a meter lógica de cálculo dentro de los servicios. Si hay
> que calcular algo nuevo, va como función pura en `aggregations/` y se ensambla en
> `compute-dashboard.ts`.

## 6. Modelo de dominio y constantes

- **Interfaces** en [`models/data-models.model.ts`](../src/app/models/data-models.model.ts).
  Hay dos grupos: las **entidades crudas** (espejo 1:1 de cada CSV, todos los campos `string`
  porque vienen sin tipar del parse) y los **tipos computados** (`DashboardData`,
  `SucursalRow`, `ProvinciaData`, `SucursalGeo`, series mensuales, etc.).
- **Constantes de dominio** en [`models/domain.constants.ts`](../src/app/models/domain.constants.ts).
  Centralizan los strings canónicos del origen para no comparar contra literales sueltos:
  - `EstadoSucursal` (Activa/Inactiva/Pendiente), `CompEstado` (Pending/InReview/Approved/Rejected),
    `MailEstado` (Sent/Failed), `MonitoringAccion` (Insert/Update/SoftDelete/Bulk…).
  - `FLAG_TRUE = '1'` + helper `isFlag()` para los booleanos serializados como texto
    (`IsOpen`, `IsDeleted`).
  - `AR_BOUNDS`: bounding box de Argentina continental para validar coordenadas.

Si cambia la grafía en el origen, se ajusta acá y el compilador marca todos los usos.

## 7. Capa de vista

### Shell — [`app.ts`](../src/app/app.ts) / [`app.html`](../src/app/app.html)
Toolbar con: título, **búsqueda global** de sucursales (autocomplete que abre el diálogo
de detalle), navegación a las 8 páginas, y **toggle de tema** claro/oscuro (persistido en
`localStorage`). El `<main>` hace `@switch` sobre `state$`: spinner (loading), mensaje +
Reintentar (error), o `<app-filter-bar>` + `<router-outlet>` (ready).

### Ruteo — [`app.routes.ts`](../src/app/app.routes.ts)
Las 8 páginas se cargan con **lazy `loadComponent`**. `''` redirige a `resumen`.

### Páginas — [`pages/`](../src/app/pages/)
Patrón uniforme:

```ts
private data = inject(DashboardSource);
d = toSignal(this.data.data$);                 // datos como signal
// cada gráfico: un método puro getX(d) + un computed que lo envuelve
xData = computed(() => { const d = this.d(); return d ? this.getX(d) : emptyChart(); });
```

- `getX(d: DashboardData)` es la **unidad pura testeada** por el spec.
- La plantilla usa el `computed` (`xData()`), **no** llama al método directo → se recalcula
  solo cuando cambia `d()`, no en cada ciclo de detección de cambios.
- Las páginas con tabla (sucursales, territorial, calidad) usan `MatTableDataSource` con
  sort + paginator y se suscriben con `takeUntilDestroyed()`.

### Componentes compartidos — [`components/`](../src/app/components/)
- `FilterBarComponent`: el filtro global (provincia, región, estado, rango de fechas + presets).
- `KpiCardComponent`: tarjeta de KPI con valor, subtítulo y opcional indicador de tendencia
  MoM (▲/▼, con modo `trendInverse` para métricas donde "subir es malo").
- `SucursalDetailDialog`: diálogo de detalle de una sucursal (datos + chips de calidad).

### Tema visual — [`shared/chart-theme.ts`](../src/app/shared/chart-theme.ts)
Paleta única (`PALETTE`) y mapeos semánticos (`ESTADO_COLOR`, `COMP_ESTADO_COLORS`,
`AUDIT_ACTION_COLORS`, …) + `emptyChart<T>()`. **No se hardcodean hex** en las páginas.

## 8. El filtro global

`DashboardFilter` (en `filter.ts`) tiene 5 criterios: `provincia`, `region`, `estado`,
`desde`, `hasta`. Vive en un `BehaviorSubject` dentro del servicio. Cualquier componente
lo muta con `setFilter(patch)`; como `data$` deriva de `combineLatest([ready$, filter$])`,
**todo el dashboard se recalcula** automáticamente.

`applyFilter` lo aplica en cascada: primero acota las sucursales (provincia/región/estado),
arma el `Set` de ids incluidos, y propaga a compensaciones, mails, distribuidores y redes;
el rango de fechas (`desde`/`hasta`) acota además los registros con timestamp (comp, mails,
auditoría). La auditoría no tiene `SucursalId`, así que solo la filtra la fecha.

Hay drill-down: desde la tabla territorial, "Ver sucursales" hace `setFilter({provincia})`
y navega a `/sucursales`.

## 9. Configuración de build y aliases

- **Path aliases** (tsconfig): `@models/*`, `@services/*`, `@components/*`, `@shared/*`,
  `@pages/*`, `@testing/*`. Los imports dentro de la misma carpeta quedan relativos.
- **Assets**: `src/assets` → `assets/` (de ahí salen los CSVs). Si se agrega un CSV nuevo
  hay que dejarlo ahí; el `describeError` del servicio avisa si falta (404).
- **CommonJS permitidos**: leaflet(+heat+markercluster) y papaparse.
- **Estilos globales**: CSS de Leaflet y MarkerCluster + `styles.scss`.
- **Budgets producción**: warn 1 MB / error 2 MB (initial).

## 10. Testing

Vitest + jsdom. Hay specs junto a cada unidad relevante:
- Agregadores puros (`coords.spec.ts`, `csv-dashboard.service.spec.ts`, …).
- Utilidades (`export.util.spec.ts`, `date-presets.util.spec.ts`).
- Cada página testea sus `getX(d)` con datos mock.
- Helpers de test en [`testing/`](../src/app/testing/) (`mocks.ts`, `mock-chart.ts`).

```bash
npx ng test --no-watch      # corrida única
```

## 11. Ruta de migración al backend (SQL Server)

El stub [`api-dashboard.service.ts`](../src/app/services/api-dashboard.service.ts) ya
define el contrato esperado del backend:

| Endpoint | Devuelve |
|----------|----------|
| `GET /api/dashboard?<filtros>` | un `DashboardData` ya agregado (el server hace `GROUP BY`/`SUM`/`COUNT`). |
| `GET /api/dashboard/filters` | `FilterOptions` (provincias, regiones, estados). |
| `GET /api/sucursales` | `SucursalRow[]` (para la búsqueda sincrónica del toolbar). |

Pasos para migrar:
1. Implementar esos endpoints en el backend devolviendo exactamente esos shapes.
2. En `app.config.ts` cambiar `useClass: CsvDashboardService` → `ApiDashboardService`.
3. Mover `baseUrl` a `environment.ts`.

La UI, las páginas, el filtro y los gráficos **no cambian**: siguen consumiendo
`DashboardData` a través de `DashboardSource`. La agregación cliente (`aggregations/`)
queda como referencia ejecutable de la lógica que el SQL debe replicar.
