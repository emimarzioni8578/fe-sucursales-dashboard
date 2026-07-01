# Guía de contribución

Convenciones para trabajar sobre **Sucursales Dashboard**. Antes de empezar, conviene leer
la [documentación de arquitectura](./docs/arquitectura.md).

## Puesta en marcha

```bash
npm install
npm start                 # ng serve -> http://localhost:4200
npx ng test --no-watch    # corrida única de tests (Vitest)
npm run build             # build de producción a dist/
```

Requisitos: Node con npm (`packageManager` fijado en `package.json`). Editor con soporte
EditorConfig + Prettier (`.editorconfig`, `.prettierrc` ya están en el repo).

## Principios de arquitectura (no negociables)

Estos invariantes son la razón de ser del diseño. Romperlos anula la posibilidad de migrar
al backend sin reescribir la UI.

1. **La UI depende de `DashboardSource`, nunca de una implementación concreta.**
   Páginas y componentes inyectan `DashboardSource` (la clase abstracta), no
   `CsvDashboardService`. El provider concreto se elige solo en `app.config.ts`.

2. **La lógica de cálculo vive en `services/aggregations/` como funciones puras.**
   Sin estado, sin Angular, sin RxJS. Los servicios solo orquestan (cargan, memoizan,
   delegan). No volver a meter cálculo dentro de un servicio.

3. **`DashboardData` es el contrato del DTO de la API.**
   Si cambia su shape, cambia el contrato que el backend deberá cumplir. Pensar cada campo
   nuevo como "¿esto lo va a poder devolver un `GROUP BY` en SQL?".

4. **Strings de dominio centralizados.** No comparar contra literales sueltos (`'Activa'`,
   `'Failed'`, `'1'`…). Usar las constantes de [`models/domain.constants.ts`](./src/app/models/domain.constants.ts)
   (`EstadoSucursal`, `CompEstado`, `MailEstado`, `MonitoringAccion`, `isFlag`, `AR_BOUNDS`).

5. **Colores centralizados.** No hardcodear hex en páginas/componentes. Usar los tokens de
   [`shared/chart-theme.ts`](./src/app/shared/chart-theme.ts) (`PALETTE`, `ESTADO_COLOR`, …).

## Cómo agregar cosas

### Una métrica / KPI nuevo
1. Calcularlo en el agregador de sección correspondiente en
   [`services/aggregations/sections.ts`](./src/app/services/aggregations/sections.ts) (o uno nuevo).
2. Agregar el campo a `DashboardData` en [`models/data-models.model.ts`](./src/app/models/data-models.model.ts).
3. Ensamblarlo en [`compute-dashboard.ts`](./src/app/services/aggregations/compute-dashboard.ts).
4. Consumirlo en la página (`<app-kpi-card>` o gráfico). Agregar/actualizar el spec.

### Una dimensión nueva (otra tabla CSV)
1. Definir la interfaz en `data-models.model.ts` y sumarla a `RawData` (`lookups.ts`).
2. Cargar el CSV en `loadAllCsv()` de [`csv-dashboard.service.ts`](./src/app/services/csv-dashboard.service.ts)
   y construir su lookup en `buildLookups()`.
3. Dejar el CSV en `src/assets/data` (se sirve vía `angular.json` → `assets/`).

### Una página nueva
1. Crear el componente standalone en `pages/` siguiendo el patrón:
   `d = toSignal(this.data.data$)` + métodos puros `getX(d)` envueltos en `computed`.
2. Registrar la ruta lazy en [`app.routes.ts`](./src/app/app.routes.ts) y el item en `navItems` (`app.ts`).

## Estilo de código

- **Imports**: usar los path aliases `@models/* @services/* @components/* @shared/* @pages/* @testing/*`.
  Los imports dentro de la misma carpeta quedan relativos.
- **TypeScript estricto**: el repo usa `strict`, `noPropertyAccessFromIndexSignature`,
  `strictTemplates`, etc. No introducir `any` salvo interop inevitable de librerías
  (p. ej. tipados parciales de Leaflet), y acotado.
- **Zoneless**: la detección de cambios depende de signals / `async` pipe. Preferir
  `toSignal` o `takeUntilDestroyed()` para consumir observables; no introducir Zone.js.
- **Prettier**: formatear antes de commitear.

## Tests

- Cada función pura nueva (agregador, util) lleva su `.spec.ts` al lado.
- En las páginas se testean los `getX(d)` con datos mock (`testing/mocks.ts`).
- Todo verde antes de abrir PR:

```bash
npx ng test --no-watch
ng build --configuration production
```

## Commits y PRs

- Mensajes de commit imperativos y acotados a un cambio lógico.
- En el PR, describir qué invariante de arquitectura se respeta/afecta si el cambio toca la
  capa de datos.
- Si el cambio acerca el proyecto a la migración al backend (endpoints, shape de
  `DashboardData`), mencionarlo explícitamente.
