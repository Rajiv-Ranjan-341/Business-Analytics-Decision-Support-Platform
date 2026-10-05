from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ColumnInfo(BaseModel):
    name: str
    dtype: str
    non_null_count: int
    null_count: int
    unique_count: int
    sample_values: list


class DatasetSummary(BaseModel):
    # Read straight off the SQLAlchemy row rather than a dict.
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    original_filename: str
    row_count: int
    column_count: int
    columns_info: list[ColumnInfo]
    upload_date: datetime
    file_size_bytes: int


class DatasetListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    original_filename: str
    row_count: int
    column_count: int
    upload_date: datetime


class ColumnStats(BaseModel):
    name: str
    dtype: str
    count: int
    null_count: int
    null_pct: float
    unique_count: int
    mean: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    median: Optional[float] = None
    top_values: list[dict] = []


class DatasetDetail(BaseModel):
    id: int
    name: str
    original_filename: str
    row_count: int
    column_count: int
    upload_date: datetime
    file_size_bytes: int
    column_stats: list[ColumnStats]
    preview_rows: list[dict]
    duplicate_count: int


class ColumnMappingRequest(BaseModel):
    mappings: dict[str, str]


class ColumnMappingResponse(BaseModel):
    dataset_id: int
    mappings: dict[str, str]
