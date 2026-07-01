# Documentación funcional

## 1. Propósito del producto

Tablero de control para el **monitoreo operativo de una red de sucursales en Argentina**.
Permite a un equipo de operaciones / negocio responder preguntas como:

- ¿Cuántas sucursales hay y qué proporción está activa?
- ¿Qué cobertura comercial tienen (distribuidores, redes sociales)?
- ¿Dónde se concentra el riesgo operativo (compensaciones abiertas, fallos de email)?
- ¿Qué tan saludable es el envío de emails de verificación?
- ¿Qué cambios se hicieron sobre los datos (auditoría)?
- ¿Qué sucursales tienen datos incompletos o inconsistentes?

Toda la información se puede acotar con un **filtro global** y exportar a CSV.

## 2. Volumen de datos (dataset de ejemplo)

| Entidad | Registros |
|---------|-----------|
| Sucursales | 800 |
| Provincias / Localidades | 24 / 117 |
| Distribuidores | 300 |
| Compensaciones | 3.500 (+ 3.500 errores asociados) |
| Mails | 6.500 |
| Eventos de auditoría (monitoring) | 14.000 |
| Vínculos sucursal-distribuidor / sucursal-red social | 1.083 / 1.190 |

## 3. Funcionalidades transversales

### Filtro global (barra superior, visible en todas las páginas)
Acota **todo el dashboard simultáneamente**. Criterios:
- **Provincia**, **Región**, **Estado** (Activa/Inactiva/Pendiente).
- **Rango de fechas** (Desde / Hasta) — acota compensaciones, mails y auditoría.
- **Presets rápidos**: "30 días", "90 días", "Este año" (YTD).
- Botón **Limpiar** para resetear.

Al cambiar cualquier criterio, los KPIs, gráficos, tablas y mapa se recalculan al instante.

### Búsqueda global (toolbar)
Campo de búsqueda con autocompletado que busca por id, nombre, email o provincia sobre
**todas** las sucursales (ignora el filtro activo). Seleccionar un resultado abre el
**diálogo de detalle** de la sucursal.

### Tema claro / oscuro
Toggle en la toolbar; la preferencia se guarda en el navegador (`localStorage`).

### Exportación a CSV
Las páginas con tablas (Operación Territorial, Sucursales, Calidad de Datos) permiten
**exportar la vista actual** (respetando el filtro y la búsqueda de la tabla) a un CSV
compatible con Excel (con BOM UTF-8).

### Estados de carga
- **Cargando**: spinner mientras se traen los datos.
- **Error**: mensaje claro (p. ej. "no se encontró el archivo de datos") con botón
  **Reintentar**.

## 4. Conceptos de negocio

### Score de Riesgo Operativo
Indicador 0–100 que resume la salud operativa de la selección actual:

```
scoreRiesgo = 0.40 × %mailsFallidos + 0.40 × %compensacionesAbiertas + 0.20 × %softDeletes
```

A mayor score, peor situación. Aparece como KPI en Resumen y en Riesgo.

### Riesgo por sucursal
Cada sucursal tiene un puntaje propio usado para priorizar en tablas y mapa:

```
riesgo = compAbiertas × 2 + mailsFallidos + (eliminada ? 5 : 0)
```

### Aging de compensaciones
Las compensaciones **abiertas** se clasifican por antigüedad desde su creación:
- **0–7 días** (recientes), **8–30 días** (en seguimiento), **>30 días** (backlog crítico).
También se reporta la **edad promedio** en días.

### Validación de coordenadas
Cada sucursal se clasifica contra el *bounding box* de Argentina continental:
- **Válida**: tiene lat/lng numéricas y caen dentro de Argentina → se grafica en el mapa.
- **Inválida**: tiene coordenadas pero caen fuera del país → problema de calidad.
- **Sin coordenada**: faltan o no son numéricas.

### Cobertura comercial
- **Cobertura de distribuidor**: % de sucursales con al menos un distribuidor asignado.
- **Cobertura social**: % de sucursales con al menos una red social vinculada.

### Tendencias (MoM)
Varios KPIs muestran la variación mes-contra-mes (▲/▼ %). En métricas donde "subir es malo"
(mails fallidos, compensaciones abiertas) el indicador se pinta en modo inverso (subir = rojo).

## 5. Páginas

La app tiene 8 secciones navegables desde la toolbar. La home redirige a **Resumen**.

### 5.1 Resumen Ejecutivo (`/resumen`)
Vista de una mirada del estado de la red.
- **KPIs**: Total Sucursales (con desglose activas/inactivas/pendientes), % Activas,
  % Cobertura Distribuidor, % Cobertura Social, Score Riesgo Operativo.
- **Gráficos**: Sucursales por Provincia (barras apiladas por estado), Estado de Sucursales
  (doughnut), Compensaciones por Mes (línea total vs. abiertas).

### 5.2 Operación Territorial (`/territorial`)
Análisis por provincia en formato tabla.
- **Tabla** ordenable y paginada: provincia, región, totales, activas/inactivas/pendientes,
  % activas, % cobertura distribuidor, % cobertura social, compensaciones abiertas.
- **Drill-down**: "Ver sucursales" filtra por esa provincia y salta a la página Sucursales.
- **Exportar CSV**.

### 5.3 Mapa (`/mapa`)
Mapa interactivo de Argentina (Leaflet + OpenStreetMap).
- **Heatmap** ponderado según la métrica elegida: **Densidad**, **Riesgo** o **Mails fallidos**.
- **Marcadores con clustering** (toggle on/off), coloreados por estado de sucursal; popup con
  nombre, provincia/región, estado, compensaciones abiertas, mails fallidos y score de riesgo.
- **Stats**: total de sucursales, cuántas se pudieron ubicar y cuántas tienen coordenadas inválidas.
- Solo se grafican sucursales con coordenada válida.

### 5.4 Sucursales (`/sucursales`)
Listado maestro de sucursales.
- **Tabla** ordenable/paginada con búsqueda local: id, nombre, provincia, localidad, estado,
  compensaciones abiertas, mails fallidos, riesgo.
- Click en una fila abre el **diálogo de detalle**.
- Muestra un chip cuando hay un filtro global activo (con opción de limpiarlo).
- **Exportar CSV** (incluye email, teléfono, totales de compensaciones, etc.).

### 5.5 Riesgo y Compensaciones (`/riesgo`)
Foco en compensaciones y riesgo operativo.
- **KPIs principales**: Compensaciones Totales, Abiertas (% del total), Edad Promedio de
  abiertas, Errores Registrados, Score Riesgo Operativo.
- **Aging**: tres KPIs 0–7 / 8–30 / >30 días.
- **Estados**: Pendientes, En Revisión, Aprobadas, Rechazadas.
- **Gráficos**: Compensaciones por Estado (doughnut), Errores por Tipo (barras),
  Compensaciones por Mes (barras apiladas abiertas/cerradas).

### 5.6 Emails y Verificación (`/emails`)
Salud del envío de emails de verificación.
- **KPIs**: Mails Totales, Enviados, Fallidos (% del total), Reintentos SMTP.
- **Gráficos**: Mails por Estado (doughnut enviados/fallidos/pendientes), Fallos por Asunto
  (barras horizontales total vs. fallidos), Distribución de Fallos por Provincia (barras).

### 5.7 Auditoría y Cambios (`/auditoria`)
Trazabilidad de las operaciones sobre los datos.
- **KPIs**: Eventos de Auditoría, Inserciones, Actualizaciones, Soft Deletes, Bulk Operations.
- **Gráficos**: Eventos por Mes (barras apiladas por acción) y Acciones por Tabla (barras
  apiladas por acción). Acciones consideradas: Insert, Update, SoftDelete, BulkInsert,
  BulkUpdate, Delete.
- Nota: la auditoría es global; el rango de fechas la acota, pero no la provincia/estado
  (los eventos no están ligados a una sucursal puntual).

### 5.8 Calidad de Datos (`/calidad`)
Detección de datos incompletos o inconsistentes.
- **Gráfico**: Cobertura Social y de Distribuidor por Provincia (%).
- **Tabla "Sucursales con problemas de calidad"**: marca cada sucursal que tenga al menos uno
  de — sin coordenada, coordenada inválida, sin distribuidor, sin red social. Buscable y
  **exportable a CSV** (con columnas Sí/No por tipo de problema).
- **Tabla "Resumen de Calidad por Provincia"**: totales y porcentajes de cobertura.

## 6. Resumen: dónde mirar según la pregunta

| Pregunta de negocio | Página |
|---------------------|--------|
| Foto general del estado de la red | Resumen Ejecutivo |
| Comparar desempeño entre provincias | Operación Territorial / Calidad |
| Dónde se concentra geográficamente el riesgo | Mapa |
| Buscar / inspeccionar una sucursal puntual | Sucursales (o búsqueda global) |
| Backlog y salud de compensaciones | Riesgo y Compensaciones |
| Problemas de entregabilidad de emails | Emails y Verificación |
| Quién cambió qué y cuándo | Auditoría y Cambios |
| Sucursales con datos faltantes o inválidos | Calidad de Datos |
