# Documentación — Sucursales Dashboard

Dashboard analítico (SPA Angular) para el monitoreo operativo de una red de sucursales
en Argentina: estado de la red, cobertura comercial, compensaciones, verificación de
emails, auditoría de cambios y calidad de datos.

## Índice

| Documento | Contenido |
|-----------|-----------|
| [Arquitectura técnica](./arquitectura.md) | Stack, flujo de datos, capa de agregación, abstracción de la fuente de datos, modelo de dominio, capa de UI, build, testing y la ruta de migración al backend. |
| [Documentación funcional](./funcional.md) | Qué hace el producto: filtro global, búsqueda, exportación, y el detalle página por página con sus KPIs y gráficos. Conceptos de negocio (score de riesgo, aging, validación de coordenadas). |
| [Modelo de datos](./modelo-datos.md) | Diagrama entidad-relación de los CSV, tablas cargadas y notas de modelado relevantes para el cálculo. |
| [Guía de contribución](../CONTRIBUTING.md) | Invariantes de arquitectura y cómo agregar métricas, dimensiones o páginas. |

## Arranque rápido

```bash
npm install
npm start          # ng serve -> http://localhost:4200
npm test           # vitest (ng test --no-watch para una corrida única)
npm run build      # build de producción a dist/
```

## Mapa mental en 30 segundos

- **Fuente de datos única y abstracta** (`DashboardSource`): hoy carga y agrega CSVs en
  el navegador (`CsvDashboardService`); mañana se cambia *una línea* en `app.config.ts`
  para que consuma una API contra SQL Server (`ApiDashboardService`).
- **La agregación vive en funciones puras** (`services/aggregations/`), no en el servicio.
  Producen un único DTO, `DashboardData`, que también es el contrato que deberá devolver
  la futura API.
- **Cada página es standalone, zoneless y basada en signals**; consume `data$` y dibuja
  KPIs, tablas y gráficos. Un **filtro global** recalcula todo el dashboard.
