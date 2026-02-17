# Backend API (Proxy)

FastAPI service que actúa como proxy para llamadas a MyGeotab y Data Connector.

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

## Endpoints

1. `GET /health`
2. `POST /api/connect`
3. `POST /api/query`

## Nota

Si sirves el add-in con este mismo backend, puedes abrir:

- `http://127.0.0.1:8080/addin/index.html`
