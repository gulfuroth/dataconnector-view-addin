from datetime import date, timedelta
from typing import List, Dict


class DataConnectorClient:
    """Data Connector integration service.

    TODO:
    - Query real historical aggregate dataset
    - Respect selected granularity and scope
    - Join with device metadata (name + serial)
    """

    def get_timeseries(self, start: date, end: date) -> List[Dict]:
        points = []
        cur = start
        i = 1
        while cur <= end:
            points.append({"bucket": cur.isoformat(), "value": float(100 + i * 7)})
            cur = cur + timedelta(days=1)
            i += 1
        return points

    def get_table_rows(self, start: date, end: date, limit: int = 50) -> List[Dict]:
        points = self.get_timeseries(start, end)[:limit]
        rows = []
        serials = ["G9-ABC-001", "G9-ABC-002", "G9-ABC-003"]
        names = ["1234ABC", "5678DEF", "9012GHI"]
        for idx, p in enumerate(points):
            rows.append({
                "bucket": p["bucket"],
                "device_name": names[idx % len(names)],
                "device_serial": serials[idx % len(serials)],
                "value": p["value"],
            })
        return rows
