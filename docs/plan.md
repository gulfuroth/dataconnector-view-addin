# Plan MVP - Data Connector View Add-In

## Objetivo

Construir un Add-In para MyGeotab que permita explorar historico agregado de un dataset unico (ej. distancia o consumo), por flota o por grupo, con granularidad diaria/mensual.

## Alcance funcional

1. Dataset unico configurable.
2. Scope de analisis:
   - Flota completa
   - Grupo MyGeotab
3. Granularidad:
   - Diaria
   - Mensual
4. Visualizacion:
   - Grafica temporal
   - Tabla detallada debajo
5. Identificacion vehiculo:
   - Nombre (`Device.Name`)
   - Numero de serie (`Device.SerialNumber`)

## No objetivo (MVP)

1. Multiples datasets simultaneos.
2. Prediccion o forecasting.
3. Alertas en tiempo real.

## Criterios de aceptacion

1. Las consultas por grupo solo incluyen dispositivos del grupo seleccionado.
2. La vista diaria/mensual es consistente para el mismo rango temporal.
3. La tabla y la grafica comparten exactamente los mismos filtros.
4. Nunca se usa el ID interno de dispositivo como clave visible para usuario.
