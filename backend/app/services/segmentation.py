import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler


def segment_customers(
    df: pd.DataFrame,
    customer_col: str,
    date_col: str,
    revenue_col: str,
    max_k: int = 8,
) -> dict:
    rfm = _compute_rfm(df, customer_col, date_col, revenue_col)

    if len(rfm) < 4:
        return {"error": "Not enough customers for segmentation (need at least 4)"}

    features = rfm[["recency", "frequency", "monetary"]].values
    scaler = StandardScaler()
    scaled = scaler.fit_transform(features)

    max_k = min(max_k, len(rfm) - 1)
    best_k, best_score = 2, -1

    for k in range(2, max_k + 1):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(scaled)
        score = silhouette_score(scaled, labels)
        if score > best_score:
            best_score = score
            best_k = k

    km = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    rfm["cluster"] = km.fit_predict(scaled)

    segments = _profile_segments(rfm)

    scatter_data = []
    for _, row in rfm.iterrows():
        scatter_data.append({
            "customer": str(row["customer"]),
            "recency": int(row["recency"]),
            "frequency": int(row["frequency"]),
            "monetary": round(float(row["monetary"]), 2),
            "cluster": int(row["cluster"]),
            "segment_name": segments[int(row["cluster"])]["name"],
        })

    return {
        "n_clusters": best_k,
        "silhouette_score": round(float(best_score), 4),
        "segments": list(segments.values()),
        "scatter_data": scatter_data,
        "rfm_summary": {
            "total_customers": len(rfm),
            "avg_recency": round(float(rfm["recency"].mean()), 1),
            "avg_frequency": round(float(rfm["frequency"].mean()), 1),
            "avg_monetary": round(float(rfm["monetary"].mean()), 2),
        },
    }


def _compute_rfm(
    df: pd.DataFrame,
    customer_col: str,
    date_col: str,
    revenue_col: str,
) -> pd.DataFrame:
    dfc = df[[customer_col, date_col, revenue_col]].copy()
    dfc[date_col] = pd.to_datetime(dfc[date_col], errors="coerce")
    dfc = dfc.dropna(subset=[date_col, revenue_col])

    reference_date = dfc[date_col].max() + pd.Timedelta(days=1)

    rfm = dfc.groupby(customer_col).agg(
        recency=(date_col, lambda x: (reference_date - x.max()).days),
        frequency=(date_col, "count"),
        monetary=(revenue_col, "sum"),
    ).reset_index()

    rfm.columns = ["customer", "recency", "frequency", "monetary"]
    return rfm


def _profile_segments(rfm: pd.DataFrame) -> dict[int, dict]:
    segments = {}
    cluster_stats = rfm.groupby("cluster").agg(
        count=("customer", "count"),
        avg_recency=("recency", "mean"),
        avg_frequency=("frequency", "mean"),
        avg_monetary=("monetary", "mean"),
        total_monetary=("monetary", "sum"),
    ).reset_index()

    overall_recency = rfm["recency"].mean()
    overall_frequency = rfm["frequency"].mean()
    overall_monetary = rfm["monetary"].mean()

    for _, row in cluster_stats.iterrows():
        cluster_id = int(row["cluster"])
        name = _assign_segment_name(
            row["avg_recency"], row["avg_frequency"], row["avg_monetary"],
            overall_recency, overall_frequency, overall_monetary,
        )

        segments[cluster_id] = {
            "cluster_id": cluster_id,
            "name": name,
            "count": int(row["count"]),
            "pct_of_total": round(float(row["count"] / len(rfm) * 100), 1),
            "avg_recency": round(float(row["avg_recency"]), 1),
            "avg_frequency": round(float(row["avg_frequency"]), 1),
            "avg_monetary": round(float(row["avg_monetary"]), 2),
            "total_revenue": round(float(row["total_monetary"]), 2),
        }

    return segments


def _assign_segment_name(
    avg_r: float, avg_f: float, avg_m: float,
    overall_r: float, overall_f: float, overall_m: float,
) -> str:
    low_r = avg_r < overall_r
    high_f = avg_f > overall_frequency if (overall_frequency := overall_f) else False
    high_m = avg_m > overall_m

    if low_r and high_f and high_m:
        return "Champions"
    if low_r and high_m:
        return "Loyal Customers"
    if low_r and not high_m:
        return "Recent Customers"
    if not low_r and high_f and high_m:
        return "At Risk (High Value)"
    if not low_r and high_f:
        return "Needs Attention"
    if not low_r and not high_f and high_m:
        return "Can't Lose Them"
    return "Hibernating"
