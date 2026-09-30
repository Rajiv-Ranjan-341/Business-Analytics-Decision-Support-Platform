from pathlib import Path

import numpy as np
import pandas as pd

from app.config import UPLOAD_DIR


# Sales exports rarely arrive as UTF-8. Excel on Windows writes cp1252 by
# default, and the public Superstore dataset carries non-breaking spaces in its
# product names that are not valid UTF-8 at all. These are ordered by how likely
# each is to be *correct*, not merely to parse: latin-1 decodes any byte
# sequence whatsoever, so it can only ever be the last resort.
CSV_ENCODINGS = ("utf-8-sig", "cp1252", "latin-1")


def read_uploaded_file(file_path: str) -> pd.DataFrame:
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix == ".csv":
        return _normalise(_read_csv_any_encoding(path))
    if suffix in (".xlsx", ".xls"):
        return _normalise(pd.read_excel(path))
    raise ValueError(f"Unsupported file type: {path.suffix}")


def _read_csv_any_encoding(path: Path) -> pd.DataFrame:
    for encoding in CSV_ENCODINGS:
        try:
            return pd.read_csv(path, encoding=encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError(
        f"Could not read {path.name}. The file is not in a text encoding this "
        "app recognises — re-save it from your spreadsheet as CSV UTF-8 and "
        "upload it again."
    )


def _normalise(df: pd.DataFrame) -> pd.DataFrame:
    """Tidy away characters that are invisible but not harmless.

    A non-breaking space reads as a space and is a different character from one,
    so "Conference\xa0phone" and "Conference phone" group as two separate
    products and quietly split a product's revenue in half. Only that character
    is touched; no value is otherwise altered.
    """
    df.columns = [
        col.replace("\xa0", " ").strip() if isinstance(col, str) else col for col in df.columns
    ]
    for col in df.columns[df.dtypes == object]:
        df[col] = df[col].map(lambda v: v.replace("\xa0", " ") if isinstance(v, str) else v)
    return df


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
