# Data Connector View Add-In

Add-In para MyGeotab orientado a visualizar historico agregado de Data Connector con foco en:

- Un dataset a la vez (ej. kilometros o consumo).
- Agregacion por flota completa o por grupo MyGeotab.
- Granularidad diaria/mensual con zoom y navegacion temporal.
- Grafica + tabla sincronizadas.
- Identificacion de vehiculo por `name` y `serialNumber` (no ID interno).

## Arquitectura

- `addin/`: frontend embebido en MyGeotab (UI filtros, grafica, tabla).
- `backend/`: API para resolver grupos MyGeotab y consulta historica optimizada.
- `docs/`: plan funcional, tecnico y roadmap.

## Estado

Base inicial y contratos API listos para implementar conexion real con:

- MyGeotab API (grupos y metadatos de dispositivos)
- Data Connector (dataset historico agregado)

## Arranque rapido (backend)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Health:

```bash
curl http://127.0.0.1:8080/health
```

## Endpoints MVP

- `GET /api/v1/groups`
- `GET /api/v1/metrics/timeseries`
- `GET /api/v1/metrics/table`
- `GET /api/v1/metrics/export.csv`

## Siguiente fase

Implementar clientes reales en:

- `backend/app/services/geotab_client.py`
- `backend/app/services/data_connector_client.py`
