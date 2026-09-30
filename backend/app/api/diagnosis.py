from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dataset, ColumnMapping
from app.services.data_processor import read_uploaded_file
from app.services.diagnosis import diagnose_metric_change

router = APIRouter(prefix="/api/diagnosis", tags=["diagnosis"])


@router.get("/{dataset_id}")
def get_diagnosis(
    dataset_id: int,
    metric: str = Query(None, description="Metric column to diagnose (defaults to revenue)"),
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    mappings = {
        m.role: m.column_name
        for m in db.query(ColumnMapping).filter(ColumnMapping.dataset_id == dataset_id).all()
    }

    date_col = mappings.get("date")
    if not date_col:
        raise HTTPException(
            status_code=400,
            detail="This page needs to know which column holds your order dates.",
        )

    metric_col = metric or mappings.get("revenue")
    if not metric_col:
        raise HTTPException(
            status_code=400,
            detail=(
                "This page needs to know which column holds your sales figures, "
                "or another number to explain instead."
            ),
        )

    df = read_uploaded_file(dataset.file_path)
    if metric_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{metric_col}' not found")

    dimension_cols = []
    for role in ["category", "region", "customer_id", "product"]:
        col = mappings.get(role)
        if col and col in df.columns:
            dimension_cols.append(col)

    result = diagnose_metric_change(df, date_col, metric_col, dimension_cols)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"dataset_id": dataset_id, **result}
