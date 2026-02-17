# Data Connector View Add-In

Add-In de MyGeotab orientado a visualizar histórico agregado de Data Connector con lógica **100% en frontend (HTML/JS)**.

## Alcance MVP

- Un dataset por consulta (`distance` o `fuel`).
- Agregación por `fleet` o por `group`.
- Granularidad `daily` / `monthly`.
- Gráfica de evolución + tabla.
- Identificación por `DeviceName` + `SerialNo`.

## Estructura

- `addin/`: implementación principal frontend-only.
- `docs/`: planificación y arquitectura.
- `backend/`: scaffold opcional no requerido para el modo frontend-only.

## Cómo usar (frontend-only)

1. Servir estáticos de `addin/` en HTTPS (requerido para Add-In en producción).
2. Abrir el Add-In e introducir:
   - Credenciales MyGeotab (server, database, user, password)
   - Base URL y token de Data Connector
3. Conectar, elegir scope/grupo/granularidad/rango y actualizar.

## Nota

Este modo evita backend propio, pero expone credenciales en cliente. Para producción enterprise, suele recomendarse backend intermedio para seguridad y gobernanza.
