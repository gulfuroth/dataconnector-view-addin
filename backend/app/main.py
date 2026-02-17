import re
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

app = FastAPI(title="Data Connector View API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionInput(BaseModel):
    mygServer: str
    mygDatabase: str
    mygUser: str
    mygPassword: str
    dcBaseUrl: str


class QueryInput(ConnectionInput):
    metric: str = Field(pattern="^(distance|fuel)$")
    scope: str = Field(pattern="^(fleet|group)$")
    groupId: Optional[str] = None
    granularity: str = Field(pattern="^(daily|monthly)$")
    from_date: date = Field(alias="from")
    to_date: date = Field(alias="to")


METRIC_COLUMN = {
    "distance": "Distance_Km",
    "fuel": "FuelUsed_Litres",
}

TABLE_BY_GRANULARITY = {
    "daily": "VehicleKpi_Daily",
    "monthly": "VehicleKpi_Monthly",
}


def _ensure(v: str, name: str):
    if not (v or "").strip():
        raise HTTPException(status_code=400, detail=f"Missing field: {name}")


def _myg_rpc(server: str, method: str, params: Dict) -> Dict:
    url = f"https://{server.strip()}/apiv1"
    try:
        res = requests.post(url, json={"method": method, "params": params}, timeout=40)
        res.raise_for_status()
        payload = res.json()
        if "error" in payload:
            raise HTTPException(status_code=502, detail=f"MyGeotab: {payload['error'].get('message', 'API error')}")
        return payload.get("result")
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"MyGeotab network error: {exc}") from exc


def _myg_credentials(inp: ConnectionInput) -> Dict:
    result = _myg_rpc(
        inp.mygServer,
        "Authenticate",
        {
            "database": inp.mygDatabase,
            "userName": inp.mygUser,
            "password": inp.mygPassword,
        },
    )
    credentials = result.get("credentials") if isinstance(result, dict) else result
    if not credentials:
        raise HTTPException(status_code=502, detail="MyGeotab authentication failed")
    return credentials


def _myg_groups(inp: ConnectionInput, credentials: Dict) -> List[Dict[str, str]]:
    result = _myg_rpc(
        inp.mygServer,
        "Get",
        {
            "typeName": "Group",
            "credentials": credentials,
        },
    )
    out: List[Dict[str, str]] = []
    for g in result or []:
        gid = g.get("id")
        name = g.get("name")
        if gid and name:
            out.append({"id": gid, "name": name})
    out.sort(key=lambda x: x["name"].lower())
    return out


def _myg_device_serials_by_group(credentials: Dict, server: str, group_id: str) -> List[str]:
    candidates = [
        {"groups": [{"id": group_id}]},
        {"groups": [group_id]},
        {"groups": [{"Id": group_id}]},
    ]

    for search in candidates:
        try:
            result = _myg_rpc(
                server,
                "Get",
                {
                    "typeName": "Device",
                    "credentials": credentials,
                    "search": search,
                },
            )
            serials = _normalize_serials([(d.get("serialNumber") or "").strip() for d in (result or []) if d.get("serialNumber")])
            if serials:
                return serials
        except HTTPException:
            continue
    return []


def _dc_auth_header(database: str, user: str, password: str) -> str:
    import base64

    raw = f"{database}/{user}:{password}".encode("utf-8")
    return "Basic " + base64.b64encode(raw).decode("ascii")


def _dc_query(base_url: str, auth_header: str, table: str, select_cols: List[str], filter_expr: Optional[str]) -> List[Dict]:
    base = base_url.strip().rstrip("/")
    url = f"{base}/{table}"
    params = {
        "$select": ",".join(select_cols),
        "$top": "1000",
    }
    if filter_expr:
        params["$filter"] = filter_expr

    out: List[Dict] = []
    headers = {"Accept": "application/json", "Authorization": auth_header}

    while url:
        try:
            res = requests.get(url, headers=headers, params=params, timeout=90)
            if not res.ok:
                body = (res.text or "")[:300]
                raise HTTPException(
                    status_code=502,
                    detail=f"Data Connector HTTP {res.status_code} for table {table}: {body}",
                )
            payload = res.json()
        except HTTPException:
            raise
        except requests.RequestException as exc:
            raise HTTPException(status_code=502, detail=f"Data Connector network error: {exc}") from exc

        out.extend(payload.get("value", []))
        url = payload.get("@odata.nextLink")
        params = None
        if len(out) >= 100000:
            break

    return out


def _serial_filter(serials: List[str]) -> str:
    escaped = [s.replace("'", "''") for s in serials]
    return "(" + " or ".join([f"SerialNo eq '{s}'" for s in escaped]) + ")"


def _chunk(values: List[str], n: int) -> List[List[str]]:
    return [values[i:i + n] for i in range(0, len(values), n)]


def _bucket(raw: str, granularity: str) -> str:
    if not raw:
        return ""
    return raw[:7] if granularity == "monthly" else raw[:10]


def _normalize_serials(serials: List[str]) -> List[str]:
    valid = []
    for s in serials:
        serial = (s or "").strip()
        if not serial:
            continue
        if serial == "000-000-0000":
            continue
        if not re.fullmatch(r"[A-Za-z0-9-]+", serial):
            continue
        valid.append(serial)
    return sorted(set(valid))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/connect")
def connect(inp: ConnectionInput):
    _ensure(inp.mygServer, "mygServer")
    _ensure(inp.mygDatabase, "mygDatabase")
    _ensure(inp.mygUser, "mygUser")
    _ensure(inp.mygPassword, "mygPassword")
    _ensure(inp.dcBaseUrl, "dcBaseUrl")

    credentials = _myg_credentials(inp)
    groups = _myg_groups(inp, credentials)
    return {"status": "ok", "groups": groups}


@app.post("/api/query")
def query(inp: QueryInput):
    if inp.scope == "group" and not inp.groupId:
        raise HTTPException(status_code=400, detail="groupId required when scope=group")
    if inp.to_date < inp.from_date:
        raise HTTPException(status_code=400, detail="to must be >= from")

    credentials = _myg_credentials(inp)
    auth_header = _dc_auth_header(inp.mygDatabase, inp.mygUser, inp.mygPassword)

    serials: List[str] = []
    if inp.scope == "group":
        serials = _myg_device_serials_by_group(credentials, inp.mygServer, inp.groupId or "")
        if not serials:
            return {"rows": [], "points": []}

    metric_col = METRIC_COLUMN[inp.metric]
    table = TABLE_BY_GRANULARITY[inp.granularity]

    date_filter = f"DateTime ge {inp.from_date.isoformat()}T00:00:00Z and DateTime le {inp.to_date.isoformat()}T23:59:59Z"

    metric_rows: List[Dict] = []
    if serials:
        # Keep URL length moderate to avoid gateway/WAF limits on large $filter clauses.
        for serial_block in _chunk(serials, 10):
            metric_rows.extend(
                _dc_query(
                    inp.dcBaseUrl,
                    auth_header,
                    table,
                    ["DateTime", "SerialNo", metric_col],
                    f"{date_filter} and {_serial_filter(serial_block)}",
                )
            )
    else:
        metric_rows = _dc_query(
            inp.dcBaseUrl,
            auth_header,
            table,
            ["DateTime", "SerialNo", metric_col],
            date_filter,
        )

    serial_set = sorted({(r.get("SerialNo") or "").strip() for r in metric_rows if r.get("SerialNo")})
    serial_set = _normalize_serials(serial_set)

    metadata_rows: List[Dict] = []
    if serial_set:
        for serial_block in _chunk(serial_set, 10):
            metadata_rows.extend(
                _dc_query(
                    inp.dcBaseUrl,
                    auth_header,
                    "LatestVehicleMetadata",
                    ["SerialNo", "DeviceName", "DateTime"],
                    _serial_filter(serial_block),
                )
            )

    metadata: Dict[str, Dict] = {}
    for m in metadata_rows:
        serial = (m.get("SerialNo") or "").strip()
        if not serial:
            continue
        dt = m.get("DateTime") or ""
        prev = metadata.get(serial)
        if prev is None or dt > prev["dt"]:
            metadata[serial] = {"dt": dt, "name": (m.get("DeviceName") or serial).strip()}

    rows: List[Dict] = []
    for r in metric_rows:
        serial = (r.get("SerialNo") or "").strip()
        if not serial:
            continue
        value = r.get(metric_col)
        if value is None:
            continue
        bucket = _bucket(str(r.get("DateTime") or ""), inp.granularity)
        if not bucket:
            continue
        rows.append(
            {
                "bucket": bucket,
                "device_name": metadata.get(serial, {}).get("name", serial),
                "device_serial": serial,
                "value": float(value),
            }
        )

    rows.sort(key=lambda x: (x["bucket"], x["device_name"], x["device_serial"]))

    agg: Dict[str, float] = defaultdict(float)
    for r in rows:
        agg[r["bucket"]] += r["value"]
    points = [{"bucket": k, "value": round(v, 3)} for k, v in sorted(agg.items(), key=lambda x: x[0])]

    return {"rows": rows, "points": points}


# Optional local static serving for dev/testing.
ADDIN_DIR = Path(__file__).resolve().parents[2] / "addin"
app.mount("/addin", StaticFiles(directory=str(ADDIN_DIR), html=True), name="addin")
