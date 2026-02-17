from datetime import date
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.responses import PlainTextResponse

from app.services.geotab_client import GeotabClient
from app.services.data_connector_client import DataConnectorClient

app = FastAPI(title="Data Connector View API", version="0.1.0")

geotab_client = GeotabClient()
data_connector_client = DataConnectorClient()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/v1/groups")
def list_groups():
    return {"groups": geotab_client.list_groups()}


@app.get("/api/v1/metrics/timeseries")
def metrics_timeseries(
    metric: str = Query(..., pattern="^(distance|fuel)$"),
    scope: str = Query("fleet", pattern="^(fleet|group)$"),
    group_id: Optional[str] = Query(None),
    granularity: str = Query("daily", pattern="^(daily|monthly)$"),
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
):
    _ = (metric, scope, group_id, granularity)
    points = data_connector_client.get_timeseries(from_date, to_date)
    return {
        "metric": metric,
        "scope": scope,
        "group_id": group_id,
        "granularity": granularity,
        "points": points,
    }


@app.get("/api/v1/metrics/table")
def metrics_table(
    metric: str = Query(..., pattern="^(distance|fuel)$"),
    scope: str = Query("fleet", pattern="^(fleet|group)$"),
    group_id: Optional[str] = Query(None),
    granularity: str = Query("daily", pattern="^(daily|monthly)$"),
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    _ = (metric, scope, group_id, granularity, page)
    rows = data_connector_client.get_table_rows(from_date, to_date, limit=page_size)
    return {
        "metric": metric,
        "scope": scope,
        "group_id": group_id,
        "granularity": granularity,
        "page": page,
        "page_size": page_size,
        "rows": rows,
    }


@app.get("/api/v1/metrics/export.csv", response_class=PlainTextResponse)
def metrics_export_csv(
    metric: str = Query(..., pattern="^(distance|fuel)$"),
    scope: str = Query("fleet", pattern="^(fleet|group)$"),
    group_id: Optional[str] = Query(None),
    granularity: str = Query("daily", pattern="^(daily|monthly)$"),
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
):
    _ = (metric, scope, group_id, granularity)
    rows = data_connector_client.get_table_rows(from_date, to_date, limit=1000)
    lines = ["bucket,device_name,device_serial,value"]
    lines.extend(f"{r['bucket']},{r['device_name']},{r['device_serial']},{r['value']}" for r in rows)
    return "\n".join(lines)
