from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dataset, ColumnMapping
from app.services.data_processor import read_uploaded_file
from app.services.profitability import analyze_product_profitability

router = APIRouter(prefix="/api/products", tags=["products"])


def _and_list(items: list[str]) -> str:
    """Join for a sentence a person reads: "a", "a and b", "a, b and c"."""
    if len(items) <= 1:
        return "".join(items)
    return "%s and %s" % (", ".join(items[:-1]), items[-1])


@router.get("/{dataset_id}/profitability")
def get_product_profitability(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    mappings = {
        m.role: m.column_name
        for m in db.query(ColumnMapping).filter(ColumnMapping.dataset_id == dataset_id).all()
    }

    product_col = mappings.get("product")
    revenue_col = mappings.get("revenue")
    if not product_col or not revenue_col:
        missing = []
        if not product_col:
            missing.append("product names")
        if not revenue_col:
            missing.append("sales figures")
        raise HTTPException(
            status_code=400,
            detail=(
                f"Product profitability needs to know where to find your {_and_list(missing)}."
            ),
        )

    df = read_uploaded_file(dataset.file_path)
    result = analyze_product_profitability(
        df,
        product_col=product_col,
        revenue_col=revenue_col,
        profit_col=mappings.get("profit"),
        quantity_col=mappings.get("quantity"),
        category_col=mappings.get("category"),
    )

    return {"dataset_id": dataset_id, **result}
