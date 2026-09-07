import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import UPLOAD_DIR, MAX_UPLOAD_SIZE_MB, ALLOWED_EXTENSIONS
from app.database import get_db
from app.models import Dataset, ColumnMapping
from app.schemas.dataset import (
    DatasetSummary,
    DatasetListItem,
    DatasetDetail,
    ColumnMappingRequest,
    ColumnMappingResponse,
)
from app.services.data_processor import (
    read_uploaded_file,
    get_column_info,
    get_column_stats,
    get_preview_rows,
    count_duplicates,
    suggest_column_roles,
)

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.post("/upload", response_model=DatasetSummary)
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Max: {MAX_UPLOAD_SIZE_MB} MB",
        )

    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        df = read_uploaded_file(str(file_path))
    except Exception as e:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    columns_info = get_column_info(df)
    name = Path(file.filename).stem.replace("_", " ").replace("-", " ").title()

    dataset = Dataset(
        name=name,
        original_filename=file.filename,
        file_path=str(file_path),
        row_count=len(df),
        column_count=len(df.columns),
        columns_info=columns_info,
        file_size_bytes=len(content),
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return dataset


@router.get("/", response_model=list[DatasetListItem])
def list_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).order_by(Dataset.upload_date.desc()).all()


@router.get("/{dataset_id}", response_model=DatasetDetail)
def get_dataset_detail(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = read_uploaded_file(dataset.file_path)
    column_stats = get_column_stats(df)
    preview_rows = get_preview_rows(df)
    duplicate_count = count_duplicates(df)

    return DatasetDetail(
        id=dataset.id,
        name=dataset.name,
        original_filename=dataset.original_filename,
        row_count=dataset.row_count,
        column_count=dataset.column_count,
        upload_date=dataset.upload_date,
        file_size_bytes=dataset.file_size_bytes,
        column_stats=column_stats,
        preview_rows=preview_rows,
        duplicate_count=duplicate_count,
    )


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    Path(dataset.file_path).unlink(missing_ok=True)
    db.delete(dataset)
    db.commit()
    return {"detail": "Dataset deleted"}


@router.get("/{dataset_id}/suggestions")
def get_column_suggestions(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = read_uploaded_file(dataset.file_path)
    suggestions = suggest_column_roles(df)
    return {"suggestions": suggestions}


@router.post("/{dataset_id}/mappings", response_model=ColumnMappingResponse)
def save_column_mappings(
    dataset_id: int,
    request: ColumnMappingRequest,
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    db.query(ColumnMapping).filter(ColumnMapping.dataset_id == dataset_id).delete()

    for role, col_name in request.mappings.items():
        if col_name:
            mapping = ColumnMapping(
                dataset_id=dataset_id, role=role, column_name=col_name
            )
            db.add(mapping)

    db.commit()
    return ColumnMappingResponse(dataset_id=dataset_id, mappings=request.mappings)


@router.get("/{dataset_id}/mappings", response_model=ColumnMappingResponse)
def get_column_mappings(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    mappings = (
        db.query(ColumnMapping).filter(ColumnMapping.dataset_id == dataset_id).all()
    )
    return ColumnMappingResponse(
        dataset_id=dataset_id,
        mappings={m.role: m.column_name for m in mappings},
    )
