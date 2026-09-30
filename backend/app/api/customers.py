from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dataset, ColumnMapping
from app.services.data_processor import read_uploaded_file
from app.services.segmentation import segment_customers

router = APIRouter(prefix="/api/customers", tags=["customers"])


def _and_list(items: list[str]) -> str:
    """Join for a sentence a person reads: "a", "a and b", "a, b and c"."""
    if len(items) <= 1:
        return "".join(items)
    return "%s and %s" % (", ".join(items[:-1]), items[-1])


@router.post("/{dataset_id}/segment")
def run_segmentation(
    dataset_id: int,
    max_clusters: int = Query(8, ge=2, le=12),
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

    customer_col = mappings.get("customer_id")
    date_col = mappings.get("date")
    revenue_col = mappings.get("revenue")

    if not all([customer_col, date_col, revenue_col]):
        missing = []
        if not customer_col:
            missing.append("customer reference")
        if not date_col:
            missing.append("order dates")
        if not revenue_col:
            missing.append("sales figures")
        raise HTTPException(
            status_code=400,
            detail=(
                f"Customer groups need to know where to find your {_and_list(missing)}."
            ),
        )

    df = read_uploaded_file(dataset.file_path)
    result = segment_customers(df, customer_col, date_col, revenue_col, max_clusters)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"dataset_id": dataset_id, **result}
