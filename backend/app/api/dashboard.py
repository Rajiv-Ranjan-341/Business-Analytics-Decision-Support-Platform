from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dataset, ColumnMapping
from app.services.data_processor import read_uploaded_file
from app.services.kpi_calculator import (
    compute_kpis,
    compute_time_series,
    compute_category_breakdown,
    compute_region_breakdown,
    compute_monthly_trend,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _get_dataset_and_mappings(dataset_id: int, db: Session):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    mappings_rows = (
        db.query(ColumnMapping)
        .filter(ColumnMapping.dataset_id == dataset_id)
        .all()
    )
    mappings = {m.role: m.column_name for m in mappings_rows}
    if not mappings:
        raise HTTPException(
            status_code=400,
            detail="Column mappings not configured. Go to Upload > Column Mapping first.",
        )

    df = read_uploaded_file(dataset.file_path)
    return df, mappings


@router.get("/{dataset_id}/kpis")
def get_kpis(dataset_id: int, db: Session = Depends(get_db)):
    df, mappings = _get_dataset_and_mappings(dataset_id, db)
    kpis = compute_kpis(df, mappings)
    return {"dataset_id": dataset_id, "kpis": kpis}


@router.get("/{dataset_id}/timeseries")
def get_timeseries(
    dataset_id: int,
    column: str = Query(None, description="Column to chart (defaults to revenue)"),
    period: str = Query("monthly", description="daily, weekly, or monthly"),
    db: Session = Depends(get_db),
):
    df, mappings = _get_dataset_and_mappings(dataset_id, db)
    date_col = mappings.get("date")
    if not date_col:
        raise HTTPException(status_code=400, detail="Date column not mapped")

    value_col = column or mappings.get("revenue")
    if not value_col or value_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{value_col}' not found")

    data = compute_time_series(df, date_col, value_col, period)
    return {"dataset_id": dataset_id, "column": value_col, "period": period, "data": data}


@router.get("/{dataset_id}/category-breakdown")
def get_category_breakdown(
    dataset_id: int,
    value_column: str = Query(None, description="Value column (defaults to revenue)"),
    db: Session = Depends(get_db),
):
    df, mappings = _get_dataset_and_mappings(dataset_id, db)
    cat_col = mappings.get("category")
    if not cat_col:
        raise HTTPException(status_code=400, detail="Category column not mapped")

    val_col = value_column or mappings.get("revenue")
    if not val_col or val_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{val_col}' not found")

    data = compute_category_breakdown(df, cat_col, val_col)
    return {"dataset_id": dataset_id, "category_column": cat_col, "value_column": val_col, "data": data}


@router.get("/{dataset_id}/region-breakdown")
def get_region_breakdown(
    dataset_id: int,
    value_column: str = Query(None),
    db: Session = Depends(get_db),
):
    df, mappings = _get_dataset_and_mappings(dataset_id, db)
    region_col = mappings.get("region")
    if not region_col:
        raise HTTPException(status_code=400, detail="Region column not mapped")

    val_col = value_column or mappings.get("revenue")
    if not val_col or val_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{val_col}' not found")

    data = compute_region_breakdown(df, region_col, val_col)
    return {"dataset_id": dataset_id, "region_column": region_col, "value_column": val_col, "data": data}


@router.get("/{dataset_id}/monthly-trend")
def get_monthly_trend(dataset_id: int, db: Session = Depends(get_db)):
    df, mappings = _get_dataset_and_mappings(dataset_id, db)
    date_col = mappings.get("date")
    if not date_col:
        raise HTTPException(status_code=400, detail="Date column not mapped")

    data = compute_monthly_trend(df, date_col, mappings.get("revenue"), mappings.get("profit"))
    return {"dataset_id": dataset_id, "data": data}
