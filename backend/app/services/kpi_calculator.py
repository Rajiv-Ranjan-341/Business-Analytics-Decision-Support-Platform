import numpy as np
import pandas as pd


def compute_kpis(df: pd.DataFrame, mappings: dict[str, str]) -> dict:
    kpis = {}

    revenue_col = mappings.get("revenue")
    profit_col = mappings.get("profit")
    quantity_col = mappings.get("quantity")
    date_col = mappings.get("date")
    customer_col = mappings.get("customer_id")
    discount_col = mappings.get("discount")

    if revenue_col and revenue_col in df.columns:
        total_revenue = float(df[revenue_col].sum())
        kpis["total_revenue"] = round(total_revenue, 2)
        kpis["avg_order_value"] = round(total_revenue / len(df), 2)

    if profit_col and profit_col in df.columns:
        total_profit = float(df[profit_col].sum())
        kpis["total_profit"] = round(total_profit, 2)
        if revenue_col and revenue_col in df.columns and total_revenue != 0:
            kpis["profit_margin"] = round((total_profit / total_revenue) * 100, 2)

    kpis["total_orders"] = len(df)

    if quantity_col and quantity_col in df.columns:
        kpis["total_units_sold"] = int(df[quantity_col].sum())

    if customer_col and customer_col in df.columns:
        kpis["unique_customers"] = int(df[customer_col].nunique())

    if discount_col and discount_col in df.columns:
        kpis["avg_discount"] = round(float(df[discount_col].mean()) * 100, 2)

    if date_col and date_col in df.columns:
        dates = pd.to_datetime(df[date_col], errors="coerce")
        if dates.notna().any():
            kpis["date_range_start"] = str(dates.min().date())
            kpis["date_range_end"] = str(dates.max().date())

            growth = _compute_growth(df, dates, revenue_col, profit_col)
            kpis.update(growth)

    return kpis


def compute_time_series(
    df: pd.DataFrame,
    date_col: str,
    value_col: str,
    period: str = "monthly",
) -> list[dict]:
    dfc = df[[date_col, value_col]].copy()
    dfc[date_col] = pd.to_datetime(dfc[date_col], errors="coerce")
    dfc = dfc.dropna(subset=[date_col, value_col])

    freq_map = {"daily": "D", "weekly": "W", "monthly": "MS"}
    freq = freq_map.get(period, "MS")

    grouped = dfc.set_index(date_col).resample(freq)[value_col].sum().reset_index()
    grouped.columns = ["date", "value"]
    grouped["date"] = grouped["date"].dt.strftime("%Y-%m-%d")

    return grouped.to_dict(orient="records")


def compute_category_breakdown(
    df: pd.DataFrame,
    category_col: str,
    value_col: str,
) -> list[dict]:
    grouped = (
        df.groupby(category_col)[value_col]
        .sum()
        .sort_values(ascending=False)
        .reset_index()
    )
    grouped.columns = ["category", "value"]
    grouped["value"] = grouped["value"].round(2)
    return grouped.to_dict(orient="records")


def compute_region_breakdown(
    df: pd.DataFrame,
    region_col: str,
    value_col: str,
) -> list[dict]:
    grouped = (
        df.groupby(region_col)[value_col]
        .sum()
        .sort_values(ascending=False)
        .reset_index()
    )
    grouped.columns = ["region", "value"]
    grouped["value"] = grouped["value"].round(2)
    return grouped.to_dict(orient="records")


def compute_monthly_trend(
    df: pd.DataFrame,
    date_col: str,
    revenue_col: str | None,
    profit_col: str | None,
) -> list[dict]:
    dfc = df.copy()
    dfc["_date"] = pd.to_datetime(dfc[date_col], errors="coerce")
    dfc = dfc.dropna(subset=["_date"])
    dfc["_month"] = dfc["_date"].dt.to_period("M")

    agg_cols = {}
    if revenue_col and revenue_col in dfc.columns:
        agg_cols[revenue_col] = "sum"
    if profit_col and profit_col in dfc.columns:
        agg_cols[profit_col] = "sum"

    if not agg_cols:
        return []

    grouped = dfc.groupby("_month").agg(agg_cols).reset_index()
    grouped["_month"] = grouped["_month"].dt.to_timestamp().dt.strftime("%Y-%m-%d")

    result = []
    for _, row in grouped.iterrows():
        entry = {"date": row["_month"]}
        if revenue_col and revenue_col in grouped.columns:
            entry["revenue"] = round(float(row[revenue_col]), 2)
        if profit_col and profit_col in grouped.columns:
            entry["profit"] = round(float(row[profit_col]), 2)
        result.append(entry)

    return result


def _compute_growth(
    df: pd.DataFrame,
    dates: pd.Series,
    revenue_col: str | None,
    profit_col: str | None,
) -> dict:
    growth = {}
    dfc = df.copy()
    dfc["_date"] = dates
    dfc["_month"] = dfc["_date"].dt.to_period("M")

    months = sorted(dfc["_month"].dropna().unique())
    if len(months) < 2:
        return growth

    current = dfc[dfc["_month"] == months[-1]]
    previous = dfc[dfc["_month"] == months[-2]]

    if revenue_col and revenue_col in df.columns:
        cur_rev = current[revenue_col].sum()
        prev_rev = previous[revenue_col].sum()
        if prev_rev != 0:
            growth["revenue_growth_pct"] = round(
                float((cur_rev - prev_rev) / prev_rev * 100), 2
            )

    if profit_col and profit_col in df.columns:
        cur_profit = current[profit_col].sum()
        prev_profit = previous[profit_col].sum()
        if prev_profit != 0:
            growth["profit_growth_pct"] = round(
                float((cur_profit - prev_profit) / prev_profit * 100), 2
            )

    growth["orders_current_month"] = len(current)
    growth["orders_previous_month"] = len(previous)

    return growth
