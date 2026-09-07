from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    columns_info = Column(JSON, default=list)
    upload_date = Column(DateTime, default=datetime.utcnow)
    file_size_bytes = Column(Integer, default=0)

    column_mappings = relationship(
        "ColumnMapping", back_populates="dataset", cascade="all, delete-orphan"
    )


class ColumnMapping(Base):
    __tablename__ = "column_mappings"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    role = Column(String, nullable=False)
    column_name = Column(String, nullable=False)

    dataset = relationship("Dataset", back_populates="column_mappings")
