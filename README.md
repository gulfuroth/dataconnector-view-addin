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
   - Base URL de Data Connector
3. El Add-In usa automáticamente `database/usuario/password` para autenticar contra Data Connector (Basic Auth).
4. Conectar, elegir scope/grupo/granularidad/rango y actualizar.
5. Usar `Export CSV` para descargar la tabla filtrada actual.

## Registro del Add-In en MyGeotab

1. Publica `addin/` en un host HTTPS (TLS 1.2+).
2. Copia y ajusta `addin/addin-manifest.example.json` con tu dominio real.
3. En MyGeotab: `Administración > Sistema > Add-Ins` (puede variar por idioma/permiso).
4. Crear nuevo Add-In e introducir el manifest.
5. Asignar permisos/perfiles que podrán verlo.

Guía detallada: `docs/register-addin.md`

## Nota

Este modo evita backend propio, pero expone credenciales en cliente. Para producción enterprise, suele recomendarse backend intermedio para seguridad y gobernanza.
