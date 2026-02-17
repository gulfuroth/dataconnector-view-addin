# Arquitectura tecnica

## Componentes

1. Add-In (frontend):
   - Corre dentro de MyGeotab.
   - Gestiona filtros, zoom temporal y rendering (chart + table).
2. Backend API:
   - Expone endpoints optimizados para el Add-In.
   - Orquesta llamadas a MyGeotab y Data Connector.
3. Capa de datos:
   - Tabla diaria y vista mensual agregada.
   - Indices por fecha, grupo y serial.

## Flujo de datos

1. Usuario abre Add-In y selecciona filtros.
2. Add-In consulta `GET /groups` para arbol/selector.
3. Add-In consulta `timeseries` y `table` con los mismos parametros.
4. Backend resuelve grupos/dispositivos y ejecuta query agregada.
5. Backend responde con:
   - Serie temporal
   - Filas tabulares paginadas

## Modelo de datos (logico)

- `fact_vehicle_metric_daily`
  - `date`
  - `device_name`
  - `device_serial`
  - `group_id`
  - `metric`
  - `value`

- `fact_vehicle_metric_monthly`
  - `month`
  - `device_name`
  - `device_serial`
  - `group_id`
  - `metric`
  - `value`

- `dim_group`
  - `group_id`
  - `group_name`
  - `parent_group_id`

## Seguridad

1. Credenciales y tokens solo en backend.
2. Add-In consume API HTTPS.
3. Validacion estricta de `tenant`, `scope`, `granularity`, rango fechas.
