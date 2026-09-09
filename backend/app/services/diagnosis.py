import numpy as np
import pandas as pd


def diagnose_metric_change(
    df: pd.DataFrame,
    date_col: str,
    metric_col: str,
    dimension_cols: list[str],
) -> dict:
    dfc = df.copy()
    dfc["_date"] = pd.to_datetime(dfc[date_col], errors="coerce")
    dfc = dfc.dropna(subset=["_date", metric_col])
    dfc["_month"] = dfc["_date"].dt.to_period("M")

    months = sorted(dfc["_month"].dropna().unique())
    if len(months) < 2:
        return {"error": "Need at least 2 months of data for diagnosis"}

    current_month = months[-1]
    previous_month = months[-2]

    current = dfc[dfc["_month"] == current_month]
    previous = dfc[dfc["_month"] == previous_month]

    cur_total = float(current[metric_col].sum())
    prev_total = float(previous[metric_col].sum())
    absolute_change = round(cur_total - prev_total, 2)
    pct_change = round((absolute_change / prev_total * 100), 2) if prev_total != 0 else 0

    overview = {
        "metric": metric_col,
        "current_month": str(current_month),
        "previous_month": str(previous_month),
        "current_value": round(cur_total, 2),
        "previous_value": round(prev_total, 2),
        "absolute_change": absolute_change,
        "pct_change": pct_change,
        "direction": "increased" if absolute_change > 0 else "decreased",
    }

    dimension_analysis = []
    for dim_col in dimension_cols:
        if dim_col not in df.columns:
            continue
        analysis = _analyze_dimension(current, previous, metric_col, dim_col)
        if analysis:
            dimension_analysis.append(analysis)

    dimension_analysis.sort(key=lambda d: d["max_abs_contribution"], reverse=True)

    top_contributors = _get_top_contributors(dimension_analysis, n=5)

    return {
        "overview": overview,
        "dimensions": dimension_analysis,
        "top_contributors": top_contributors,
    }


def _analyze_dimension(
    current: pd.DataFrame,
    previous: pd.DataFrame,
    metric_col: str,
    dim_col: str,
) -> dict | None:
    cur_grouped = current.groupby(dim_col)[metric_col].sum()
    prev_grouped = previous.groupby(dim_col)[metric_col].sum()

    all_values = set(cur_grouped.index) | set(prev_grouped.index)
    if not all_values:
        return None

    total_change = float(cur_grouped.sum() - prev_grouped.sum())

    contributions = []
    for val in all_values:
        cur_val = float(cur_grouped.get(val, 0))
        prev_val = float(prev_grouped.get(val, 0))
        change = cur_val - prev_val
        pct_of_change = round((change / total_change * 100), 2) if total_change != 0 else 0
        val_pct_change = round((change / prev_val * 100), 2) if prev_val != 0 else (100.0 if cur_val > 0 else 0)

        contributions.append({
            "value": str(val),
            "current": round(cur_val, 2),
            "previous": round(prev_val, 2),
            "change": round(change, 2),
            "pct_change": val_pct_change,
            "contribution_pct": pct_of_change,
        })

    contributions.sort(key=lambda c: abs(c["change"]), reverse=True)

    return {
        "dimension": dim_col,
        "contributions": contributions[:10],
        "max_abs_contribution": max(abs(c["change"]) for c in contributions) if contributions else 0,
    }


def _get_top_contributors(dimensions: list[dict], n: int = 5) -> list[dict]:
    all_contribs = []
    for dim in dimensions:
        for c in dim["contributions"]:
            all_contribs.append({
                "dimension": dim["dimension"],
                "value": c["value"],
                "change": c["change"],
                "pct_change": c["pct_change"],
                "contribution_pct": c["contribution_pct"],
            })

    all_contribs.sort(key=lambda c: abs(c["change"]), reverse=True)
    return all_contribs[:n]
