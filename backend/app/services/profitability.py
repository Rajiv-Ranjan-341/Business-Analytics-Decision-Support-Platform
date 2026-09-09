import numpy as np
import pandas as pd


def analyze_product_profitability(
    df: pd.DataFrame,
    product_col: str,
    revenue_col: str,
    profit_col: str | None = None,
    quantity_col: str | None = None,
    category_col: str | None = None,
) -> dict:
    agg = {revenue_col: "sum"}
    if profit_col and profit_col in df.columns:
        agg[profit_col] = "sum"
    if quantity_col and quantity_col in df.columns:
        agg[quantity_col] = "sum"

    grouped = df.groupby(product_col).agg(agg).reset_index()
    grouped = grouped.rename(columns={product_col: "product"})

    if category_col and category_col in df.columns:
        cat_map = df.groupby(product_col)[category_col].first().to_dict()
        grouped["category"] = grouped["product"].map(cat_map)

    grouped["revenue"] = grouped[revenue_col].round(2)
    total_revenue = grouped["revenue"].sum()
    grouped["revenue_share_pct"] = (grouped["revenue"] / total_revenue * 100).round(2)

    if profit_col and profit_col in grouped.columns:
        grouped["profit"] = grouped[profit_col].round(2)
        grouped["margin_pct"] = np.where(
            grouped["revenue"] != 0,
            (grouped["profit"] / grouped["revenue"] * 100).round(2),
            0,
        )
    else:
        grouped["profit"] = None
        grouped["margin_pct"] = None

    if quantity_col and quantity_col in grouped.columns:
        grouped["units_sold"] = grouped[quantity_col].astype(int)
    else:
        grouped["units_sold"] = None

    grouped["order_count"] = df.groupby(product_col).size().values

    products = []
    for _, row in grouped.iterrows():
        p = {
            "product": str(row["product"]),
            "revenue": float(row["revenue"]),
            "revenue_share_pct": float(row["revenue_share_pct"]),
            "order_count": int(row["order_count"]),
        }
        if "category" in row:
            p["category"] = str(row["category"])
        if row["profit"] is not None:
            p["profit"] = float(row["profit"])
            p["margin_pct"] = float(row["margin_pct"])
        if row["units_sold"] is not None:
            p["units_sold"] = int(row["units_sold"])
        products.append(p)

    products.sort(key=lambda x: x["revenue"], reverse=True)

    tags = _tag_products(products)
    scatter = _build_scatter(products)

    summary = {
        "total_products": len(products),
        "total_revenue": round(total_revenue, 2),
    }
    if profit_col and profit_col in df.columns:
        total_profit = float(grouped["profit"].sum())
        summary["total_profit"] = round(total_profit, 2)
        summary["avg_margin_pct"] = round(total_profit / total_revenue * 100, 2) if total_revenue else 0
        summary["loss_making_products"] = sum(1 for p in products if p.get("profit", 0) < 0)

    return {
        "products": products,
        "tags": tags,
        "scatter": scatter,
        "summary": summary,
    }


def _tag_products(products: list[dict]) -> dict[str, list[str]]:
    tags = {
        "high_revenue_low_margin": [],
        "high_margin": [],
        "loss_making": [],
        "top_sellers": [],
    }

    if not products:
        return tags

    revenues = [p["revenue"] for p in products]
    median_rev = float(np.median(revenues))

    for p in products:
        name = p["product"]
        margin = p.get("margin_pct")

        if p["revenue"] >= median_rev and margin is not None and margin < 5:
            tags["high_revenue_low_margin"].append(name)
        if margin is not None and margin > 30:
            tags["high_margin"].append(name)
        if p.get("profit") is not None and p["profit"] < 0:
            tags["loss_making"].append(name)

    tags["top_sellers"] = [p["product"] for p in products[:5]]
    return tags


def _build_scatter(products: list[dict]) -> list[dict]:
    scatter = []
    for p in products:
        if p.get("margin_pct") is not None:
            scatter.append({
                "product": p["product"],
                "revenue": p["revenue"],
                "margin_pct": p["margin_pct"],
                "profit": p.get("profit", 0),
            })
    return scatter
