import numpy as np
import pandas as pd
from xgboost import XGBRegressor


def run_what_if(
    df: pd.DataFrame,
    mappings: dict[str, str],
    adjustments: dict[str, float],
) -> dict:
    revenue_col = mappings.get("revenue")
    profit_col = mappings.get("profit")
    quantity_col = mappings.get("quantity")
    discount_col = mappings.get("discount")

    if not revenue_col or revenue_col not in df.columns:
        return {
            "error": (
                "The simulator needs to know which column holds your sales figures."
            )
        }

    baseline = _compute_baseline(df, revenue_col, profit_col, quantity_col, discount_col)

    simulated_df = df.copy()
    changes_applied = []

    if "price_change_pct" in adjustments and revenue_col:
        pct = adjustments["price_change_pct"]
        simulated_df[revenue_col] = simulated_df[revenue_col] * (1 + pct / 100)
        changes_applied.append({"parameter": "Price/Revenue", "change": f"{pct:+.1f}%"})

    if "discount_change_pct" in adjustments and discount_col and discount_col in df.columns:
        pct = adjustments["discount_change_pct"]
        simulated_df[discount_col] = (simulated_df[discount_col] + pct / 100).clip(0, 1)
        changes_applied.append({"parameter": "Discount Rate", "change": f"{pct:+.1f}pp"})

        elasticity = -1.5
        demand_effect = 1 + (pct / 100) * abs(elasticity)
        if quantity_col and quantity_col in simulated_df.columns:
            simulated_df[quantity_col] = (simulated_df[quantity_col] * demand_effect).round().astype(int).clip(lower=0)
        simulated_df[revenue_col] = simulated_df[revenue_col] * demand_effect * (1 - pct / 100)

    if "quantity_change_pct" in adjustments and quantity_col and quantity_col in df.columns:
        pct = adjustments["quantity_change_pct"]
        simulated_df[quantity_col] = (simulated_df[quantity_col] * (1 + pct / 100)).round().astype(int).clip(lower=0)
        changes_applied.append({"parameter": "Quantity/Demand", "change": f"{pct:+.1f}%"})

    if "cost_change_pct" in adjustments and profit_col and profit_col in df.columns:
        pct = adjustments["cost_change_pct"]
        cost_estimate = simulated_df[revenue_col] - simulated_df[profit_col]
        cost_adjusted = cost_estimate * (1 + pct / 100)
        simulated_df[profit_col] = simulated_df[revenue_col] - cost_adjusted
        changes_applied.append({"parameter": "Cost", "change": f"{pct:+.1f}%"})

    simulated = _compute_baseline(simulated_df, revenue_col, profit_col, quantity_col, discount_col)

    comparison = _build_comparison(baseline, simulated)

    recommendation = _generate_recommendation(baseline, simulated, changes_applied)

    return {
        "baseline": baseline,
        "simulated": simulated,
        "comparison": comparison,
        "changes_applied": changes_applied,
        "recommendation": recommendation,
    }


def _compute_baseline(
    df: pd.DataFrame,
    revenue_col: str,
    profit_col: str | None,
    quantity_col: str | None,
    discount_col: str | None,
) -> dict:
    metrics = {
        "total_revenue": round(float(df[revenue_col].sum()), 2),
        "avg_revenue_per_order": round(float(df[revenue_col].mean()), 2),
        "total_orders": len(df),
    }

    if profit_col and profit_col in df.columns:
        total_profit = float(df[profit_col].sum())
        metrics["total_profit"] = round(total_profit, 2)
        if metrics["total_revenue"] != 0:
            metrics["profit_margin_pct"] = round(total_profit / metrics["total_revenue"] * 100, 2)

    if quantity_col and quantity_col in df.columns:
        metrics["total_units"] = int(df[quantity_col].sum())

    if discount_col and discount_col in df.columns:
        metrics["avg_discount_pct"] = round(float(df[discount_col].mean()) * 100, 2)

    return metrics


def _build_comparison(baseline: dict, simulated: dict) -> list[dict]:
    comparison = []
    labels = {
        "total_revenue": "Total Revenue",
        "total_profit": "Total Profit",
        "profit_margin_pct": "Profit Margin",
        "total_units": "Total Units",
        "avg_discount_pct": "Avg Discount",
        "avg_revenue_per_order": "Avg Revenue/Order",
    }

    for key, label in labels.items():
        if key in baseline and key in simulated:
            base_val = baseline[key]
            sim_val = simulated[key]
            change = sim_val - base_val
            pct_change = round((change / base_val * 100), 2) if base_val != 0 else 0
            comparison.append({
                "metric": label,
                "key": key,
                "baseline": base_val,
                "simulated": round(sim_val, 2),
                "change": round(change, 2),
                "pct_change": pct_change,
            })

    return comparison


def _generate_recommendation(
    baseline: dict,
    simulated: dict,
    changes: list[dict],
) -> dict:
    if not changes:
        return {"verdict": "neutral", "text": "No changes applied."}

    rev_change = simulated.get("total_revenue", 0) - baseline.get("total_revenue", 0)
    profit_change = simulated.get("total_profit", 0) - baseline.get("total_profit", 0)

    has_profit = "total_profit" in baseline and "total_profit" in simulated

    if has_profit:
        if profit_change > 0 and rev_change >= 0:
            verdict = "positive"
            text = f"This scenario increases profit by ${profit_change:,.2f} and revenue by ${rev_change:,.2f}. Recommended."
        elif profit_change > 0 and rev_change < 0:
            verdict = "cautious"
            text = f"Profit increases by ${profit_change:,.2f} but revenue decreases by ${abs(rev_change):,.2f}. Consider if the revenue drop is acceptable."
        elif profit_change < 0 and rev_change > 0:
            verdict = "cautious"
            text = f"Revenue increases by ${rev_change:,.2f} but profit decreases by ${abs(profit_change):,.2f}. Higher sales don't always mean higher profit."
        else:
            verdict = "negative"
            text = f"Both revenue and profit decrease. Revenue: ${rev_change:,.2f}, Profit: ${profit_change:,.2f}. Not recommended."
    else:
        if rev_change > 0:
            verdict = "positive"
            text = f"Revenue increases by ${rev_change:,.2f}."
        elif rev_change < 0:
            verdict = "negative"
            text = f"Revenue decreases by ${abs(rev_change):,.2f}."
        else:
            verdict = "neutral"
            text = "No significant revenue change."

    return {"verdict": verdict, "text": text}
