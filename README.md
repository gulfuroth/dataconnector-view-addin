# Data Connector View Add-In

Add-In de MyGeotab orientado a visualizar histórico agregado de Data Connector.

La UI está en `addin/` y las llamadas a MyGeotab/Data Connector pasan por `backend/` para evitar CORS.

## Alcance MVP

- Un dataset por consulta (`distance` o `fuel`).
- Agregación por `fleet` o por `group`.
- Granularidad `daily` / `monthly`.
- Gráfica de evolución + tabla.
- Identificación por `DeviceName` + `SerialNo`.

## Estructura

- `addin/`: frontend del Add-In.
- `docs/`: planificación y arquitectura.
- `backend/`: API proxy necesaria para MyGeotab + Data Connector.

## Cómo usar

1. Arrancar backend:
   - `cd backend`
   - `python3 -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt`
   - `uvicorn app.main:app --reload --port 8080`
2. Servir `addin/` en HTTPS (o desde el backend en `/addin` para pruebas locales).
3. Abrir el Add-In e introducir:
   - Credenciales MyGeotab (server, database, user, password)
   - Base URL de Data Connector
4. El backend usa automáticamente `database/usuario/password` para autenticar contra Data Connector (Basic Auth).
5. Conectar, elegir scope/grupo/granularidad/rango y actualizar.
6. Usar `Export CSV` para descargar la tabla filtrada actual.
7. Si activas `Recordar password`, se guardará localmente en el navegador; si no, no se persiste.

## Registro del Add-In en MyGeotab

1. Publica `addin/` en un host HTTPS (TLS 1.2+).
2. Copia y ajusta `addin/addin-manifest.example.json` con tu dominio real.
3. En MyGeotab: `Administración > Sistema > Add-Ins` (puede variar por idioma/permiso).
4. Crear nuevo Add-In e introducir el manifest.
5. Asignar permisos/perfiles que podrán verlo.

Guía detallada: `docs/register-addin.md`

## Nota

Este diseño evita el bloqueo CORS en llamadas directas de navegador a Data Connector.
