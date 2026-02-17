# Backend API

FastAPI service para servir datos al Add-In.

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

## Implementacion pendiente

1. `GeotabClient` real para grupos/dispositivos.
2. `DataConnectorClient` real para dataset historico.
3. Persistencia/cache para consultas grandes.
