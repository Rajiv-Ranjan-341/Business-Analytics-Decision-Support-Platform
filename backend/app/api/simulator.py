from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dataset, ColumnMapping
from app.services.data_processor import read_uploaded_file
from app.services.simulator import run_what_if
from app.services.explainer import explain_model


class SimulationRequest(BaseModel):
    price_change_pct: float | None = None
    discount_change_pct: float | None = None
    quantity_change_pct: float | None = None
    cost_change_pct: float | None = None


router = APIRouter(prefix="/api/simulator", tags=["simulator"])


@router.post("/{dataset_id}/what-if")
def what_if_simulation(
    dataset_id: int,
    request: SimulationRequest,
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    mappings = {
        m.role: m.column_name
        for m in db.query(ColumnMapping).filter(ColumnMapping.dataset_id == dataset_id).all()
    }

    df = read_uploaded_file(dataset.file_path)

    adjustments = {}
    if request.price_change_pct is not None:
        adjustments["price_change_pct"] = request.price_change_pct
    if request.discount_change_pct is not None:
        adjustments["discount_change_pct"] = request.discount_change_pct
    if request.quantity_change_pct is not None:
        adjustments["quantity_change_pct"] = request.quantity_change_pct
    if request.cost_change_pct is not None:
        adjustments["cost_change_pct"] = request.cost_change_pct

    if not adjustments:
        raise HTTPException(status_code=400, detail="At least one adjustment parameter is required")

    result = run_what_if(df, mappings, adjustments)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"dataset_id": dataset_id, **result}


@router.get("/{dataset_id}/explain")
def get_explanation(
    dataset_id: int,
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    mappings = {
        m.role: m.column_name
        for m in db.query(ColumnMapping).filter(ColumnMapping.dataset_id == dataset_id).all()
    }

    revenue_col = mappings.get("revenue")
    if not revenue_col:
        raise HTTPException(
            status_code=400,
            detail="This page needs to know which column holds your sales figures.",
        )

    df = read_uploaded_file(dataset.file_path)

    if revenue_col not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=(
                f"This file has no column called '{revenue_col}'. Its column meanings may "
                "have been set against an earlier version of the file."
            ),
        )

    # Profit is deliberately absent from this list. Profit is revenue minus cost,
    # so using it to explain revenue restates the target: the model leans on it,
    # it is crowned the biggest driver, and the answer is a tautology rather than
    # something a shop owner can act on. Any column mapped to the target itself is
    # dropped for the same reason, and because a duplicated column makes the
    # model fail outright.
    feature_cols = []
    for role in ["quantity", "discount", "category", "region"]:
        col = mappings.get(role)
        if col and col in df.columns and col != revenue_col and col not in feature_cols:
            feature_cols.append(col)

    if len(feature_cols) < 2:
        raise HTTPException(
            status_code=400,
            detail=(
                "This page needs at least two other columns to weigh against your sales "
                "figures, such as quantity, discount, product categories or sales regions."
            ),
        )

    result = explain_model(df, revenue_col, feature_cols)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"dataset_id": dataset_id, **result}
