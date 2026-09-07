from pathlib import Path

import numpy as np
import pandas as pd

from app.config import UPLOAD_DIR


def read_uploaded_file(file_path: str) -> pd.DataFrame:
    path = Path(file_path)
    if path.suffix == ".csv":
        return pd.read_csv(path)
    elif path.suffix in (".xlsx", ".xls"):
        return pd.read_excel(path)
    raise ValueError(f"Unsupported file type: {path.suffix}")


def get_column_info(df: pd.DataFrame) -> list[dict]:
    info = []
    for col in df.columns:
        samples = df[col].dropna().head(5).tolist()
        samples = [str(s) for s in samples]
        info.append({
            "name": col,
            "dtype": str(df[col].dtype),
            "non_null_count": int(df[col].notna().sum()),
            "null_count": int(df[col].isna().sum()),
            "unique_count": int(df[col].nunique()),
            "sample_values": samples,
        })
    return info


def get_column_stats(df: pd.DataFrame) -> list[dict]:
    stats = []
    for col in df.columns:
        s = {
            "name": col,
            "dtype": str(df[col].dtype),
            "count": int(df[col].notna().sum()),
            "null_count": int(df[col].isna().sum()),
            "null_pct": round(float(df[col].isna().mean() * 100), 2),
            "unique_count": int(df[col].nunique()),
        }

        if pd.api.types.is_numeric_dtype(df[col]):
            desc = df[col].describe()
            s["mean"] = _safe_float(desc.get("mean"))
            s["std"] = _safe_float(desc.get("std"))
            s["min"] = _safe_float(desc.get("min"))
            s["max"] = _safe_float(desc.get("max"))
            s["median"] = _safe_float(df[col].median())

        top = df[col].value_counts().head(5)
        s["top_values"] = [
            {"value": str(v), "count": int(c)} for v, c in top.items()
        ]
        stats.append(s)
    return stats


def get_preview_rows(df: pd.DataFrame, n: int = 20) -> list[dict]:
    preview = df.head(n).copy()
    for col in preview.columns:
        preview[col] = preview[col].apply(
            lambda x: None if pd.isna(x) else x
        )
    return preview.to_dict(orient="records")


def count_duplicates(df: pd.DataFrame) -> int:
    return int(df.duplicated().sum())


def detect_date_columns(df: pd.DataFrame) -> list[str]:
    date_cols = []
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            date_cols.append(col)
            continue
        if df[col].dtype == object:
            sample = df[col].dropna().head(100)
            try:
                pd.to_datetime(sample)
                date_cols.append(col)
            except (ValueError, TypeError):
                pass
    return date_cols


def detect_numeric_columns(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]


def detect_categorical_columns(df: pd.DataFrame) -> list[str]:
    return [
        c for c in df.columns
        if df[c].dtype == object or pd.api.types.is_categorical_dtype(df[c])
    ]


def suggest_column_roles(df: pd.DataFrame) -> dict[str, str | None]:
    suggestions = {
        "date": None,
        "revenue": None,
        "profit": None,
        "quantity": None,
        "customer_id": None,
        "product": None,
        "category": None,
        "region": None,
        "discount": None,
        "cost": None,
    }

    col_lower = {c.lower().strip(): c for c in df.columns}

    role_keywords = {
        "date": ["date", "order date", "order_date", "orderdate", "ship date"],
        "revenue": ["sales", "revenue", "amount", "total"],
        "profit": ["profit", "margin", "net"],
        "quantity": ["quantity", "qty", "units", "count"],
        "customer_id": ["customer id", "customer_id", "customerid", "customer name"],
        "product": ["product name", "product_name", "productname", "product", "item"],
        "category": ["category", "segment", "sub-category", "subcategory", "sub_category"],
        "region": ["region", "state", "city", "country", "market"],
        "discount": ["discount", "discount_rate"],
        "cost": ["cost", "cogs", "expense", "unit cost"],
    }

    for role, keywords in role_keywords.items():
        for kw in keywords:
            if kw in col_lower:
                suggestions[role] = col_lower[kw]
                break

    return suggestions


def _safe_float(val) -> float | None:
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    return round(float(val), 4)
