from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dataset, ColumnMapping
from app.services.data_processor import read_uploaded_file
from app.services.forecaster import forecast_time_series

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.post("/{dataset_id}")
def run_forecast(
    dataset_id: int,
    column: str = Query(None, description="Column to forecast (defaults to revenue)"),
    periods: int = Query(6, ge=1, le=24, description="Number of periods to forecast"),
    period_type: str = Query("monthly", description="daily, weekly, or monthly"),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    mappings_rows = (
        db.query(ColumnMapping)
        .filter(ColumnMapping.dataset_id == dataset_id)
        .all()
    )
    mappings = {m.role: m.column_name for m in mappings_rows}

    date_col = mappings.get("date")
    if not date_col:
        raise HTTPException(status_code=400, detail="Date column not mapped")

    value_col = column or mappings.get("revenue")
    if not value_col:
        raise HTTPException(status_code=400, detail="No value column specified or revenue not mapped")

    df = read_uploaded_file(dataset.file_path)
    if value_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{value_col}' not found")

    result = forecast_time_series(df, date_col, value_col, periods, period_type)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {
        "dataset_id": dataset_id,
        "column": value_col,
        "periods": periods,
        "period_type": period_type,
        **result,
    }
