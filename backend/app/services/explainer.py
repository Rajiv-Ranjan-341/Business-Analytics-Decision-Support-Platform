import io
import base64

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import shap
from xgboost import XGBRegressor


def explain_model(
    df: pd.DataFrame,
    target_col: str,
    feature_cols: list[str],
    top_n: int = 10,
) -> dict:
    dfc = df[feature_cols + [target_col]].dropna()
    if len(dfc) < 10:
        return {"error": "Not enough data for explanation (need at least 10 rows)"}

    X = pd.get_dummies(dfc[feature_cols], drop_first=True).astype(float)
    y = dfc[target_col].values

    model = XGBRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42,
        verbosity=0,
    )
    model.fit(X, y)

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)

    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    feature_names = X.columns.tolist()

    importance = sorted(
        zip(feature_names, mean_abs_shap),
        key=lambda x: x[1],
        reverse=True,
    )[:top_n]

    feature_importance = [
        {"feature": name, "importance": round(float(val), 4)}
        for name, val in importance
    ]

    summary_plot_b64 = _generate_summary_plot(shap_values, X, top_n)
    bar_plot_b64 = _generate_bar_plot(feature_importance)

    return {
        "target": target_col,
        "n_features": len(feature_names),
        "n_samples": len(dfc),
        "feature_importance": feature_importance,
        "summary_plot": summary_plot_b64,
        "bar_plot": bar_plot_b64,
    }


def _generate_summary_plot(shap_values, X, top_n) -> str | None:
    try:
        fig, ax = plt.subplots(figsize=(10, 6))
        shap.summary_plot(shap_values, X, max_display=top_n, show=False)
        plt.tight_layout()
        return _fig_to_base64(plt.gcf())
    except Exception:
        return None
    finally:
        plt.close("all")


def _generate_bar_plot(feature_importance: list[dict]) -> str | None:
    try:
        names = [f["feature"] for f in reversed(feature_importance)]
        values = [f["importance"] for f in reversed(feature_importance)]

        fig, ax = plt.subplots(figsize=(10, 6))
        colors = plt.cm.Blues(np.linspace(0.4, 0.9, len(names)))
        ax.barh(names, values, color=colors)
        ax.set_xlabel("Mean |SHAP Value|")
        ax.set_title("Feature Importance (SHAP)")
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        plt.tight_layout()
        return _fig_to_base64(fig)
    except Exception:
        return None
    finally:
        plt.close("all")


def _fig_to_base64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=100, bbox_inches="tight")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")
