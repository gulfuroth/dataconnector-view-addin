from typing import Literal
from pydantic import BaseModel

Scope = Literal["fleet", "group"]
Granularity = Literal["daily", "monthly"]
Metric = Literal["distance", "fuel"]


class GroupItem(BaseModel):
    id: str
    name: str


class TimeSeriesPoint(BaseModel):
    bucket: str
    value: float


class TableRow(BaseModel):
    bucket: str
    device_name: str
    device_serial: str
    value: float
