import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor


def forecast_time_series(
    df: pd.DataFrame,
    date_col: str,
    value_col: str,
    periods: int = 6,
    period_type: str = "monthly",
) -> dict:
    dfc = df[[date_col, value_col]].copy()
    dfc[date_col] = pd.to_datetime(dfc[date_col], errors="coerce")
    dfc = dfc.dropna(subset=[date_col, value_col])

    freq_map = {"daily": "D", "weekly": "W", "monthly": "MS"}
    freq = freq_map.get(period_type, "MS")

    ts = dfc.set_index(date_col).resample(freq)[value_col].sum().reset_index()
    ts.columns = ["date", "value"]
    ts = ts.sort_values("date").reset_index(drop=True)

    if len(ts) < 6:
        return {"error": "Not enough data points for forecasting (need at least 6)"}

    xgb_result = _xgboost_forecast(ts, periods, freq)
    exp_result = _exp_smoothing_forecast(ts, periods, freq)

    best = _pick_best(xgb_result, exp_result)

    historical = []
    for _, row in ts.iterrows():
        historical.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "value": round(float(row["value"]), 2),
        })

    return {
        "historical": historical,
        "forecast": best["forecast"],
        "best_model": best["model_name"],
        "models": {
            "xgboost": {
                "forecast": xgb_result["forecast"],
                "mae": xgb_result["mae"],
                "rmse": xgb_result["rmse"],
                "mape": xgb_result["mape"],
            },
            "exp_smoothing": {
                "forecast": exp_result["forecast"],
                "mae": exp_result["mae"],
                "rmse": exp_result["rmse"],
                "mape": exp_result["mape"],
            },
        },
    }


def _pick_best(xgb_result: dict, exp_result: dict) -> dict:
    """Lowest MAPE wins, but only among models that were actually measured.

    A model whose hold-out slice came out empty has no score at all. It cannot
    win on accuracy, because there is no evidence it is accurate. If neither
    model could be measured — a history too short to hold anything back — the
    simpler one is returned, since a single-example gradient boosting fit is the
    less defensible of the two.
    """
    xgb_mape = xgb_result["mape"]
    exp_mape = exp_result["mape"]

    if xgb_mape is None:
        # Covers both "only XGBoost went unmeasured" and "neither was measured":
        # either way exponential smoothing is the one to return.
        return exp_result
    if exp_mape is None:
        return xgb_result
    return xgb_result if xgb_mape <= exp_mape else exp_result


def _xgboost_forecast(ts: pd.DataFrame, periods: int, freq: str) -> dict:
    values = ts["value"].values
    dates = ts["date"].values

    n_lags = min(6, len(values) - 1)
    X, y = _create_lag_features(values, n_lags)

    split = max(1, int(len(X) * 0.8))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = XGBRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42,
        verbosity=0,
    )
    model.fit(X_train, y_train)

    if len(X_test) > 0:
        y_pred = model.predict(X_test)
        mae = round(float(mean_absolute_error(y_test, y_pred)), 2)
        rmse = round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 2)
        mape = round(float(_mape(y_test, y_pred)), 2)
    else:
        # Nothing was held back, so there is no score. Reporting 0.0 here would
        # read as a perfect model and — because selection is lowest-MAPE-wins —
        # would hand the win to whichever model was never measured.
        mae = rmse = mape = None

    model.fit(X, y)

    last_window = list(values[-n_lags:])
    forecast_values = []
    last_date = pd.Timestamp(dates[-1])

    for i in range(periods):
        features = np.array(last_window[-n_lags:]).reshape(1, -1)
        pred = float(model.predict(features)[0])
        pred = max(0, pred)
        forecast_values.append(pred)
        last_window.append(pred)

    forecast_dates = pd.date_range(start=last_date, periods=periods + 1, freq=freq)[1:]

    std_val = float(np.std(values[-min(12, len(values)):]))
    forecast = []
    for i, (d, v) in enumerate(zip(forecast_dates, forecast_values)):
        margin = std_val * (1 + 0.1 * i)
        forecast.append({
            "date": d.strftime("%Y-%m-%d"),
            "value": round(v, 2),
            "lower": round(max(0, v - margin), 2),
            "upper": round(v + margin, 2),
        })

    return {
        "model_name": "XGBoost",
        "forecast": forecast,
        "mae": mae,
        "rmse": rmse,
        "mape": mape,
    }


def _exp_smoothing_forecast(ts: pd.DataFrame, periods: int, freq: str) -> dict:
    values = ts["value"].values
    dates = ts["date"].values

    split = max(1, int(len(values) * 0.8))
    train = values[:split]
    test = values[split:]

    best_alpha = 0.3
    if len(test) > 0:
        best_mape = float("inf")
        for alpha in [0.1, 0.2, 0.3, 0.5, 0.7, 0.9]:
            preds = _exp_smooth_predict(train, alpha, len(test))
            m = _mape(test, np.array(preds))
            if m < best_mape:
                best_mape = m
                best_alpha = alpha

    if len(test) > 0:
        preds = _exp_smooth_predict(train, best_alpha, len(test))
        mae = round(float(mean_absolute_error(test, preds)), 2)
        rmse = round(float(np.sqrt(mean_squared_error(test, preds))), 2)
        mape = round(float(_mape(test, np.array(preds))), 2)
    else:
        # Same reasoning as the XGBoost branch: unmeasured is not perfect.
        mae = rmse = mape = None

    forecast_values = _exp_smooth_predict(values, best_alpha, periods)
    last_date = pd.Timestamp(dates[-1])
    forecast_dates = pd.date_range(start=last_date, periods=periods + 1, freq=freq)[1:]

    std_val = float(np.std(values[-min(12, len(values)):]))
    forecast = []
    for i, (d, v) in enumerate(zip(forecast_dates, forecast_values)):
        margin = std_val * (1.2 + 0.15 * i)
        forecast.append({
            "date": d.strftime("%Y-%m-%d"),
            "value": round(max(0, v), 2),
            "lower": round(max(0, v - margin), 2),
            "upper": round(v + margin, 2),
        })

    return {
        "model_name": "Exponential Smoothing",
        "forecast": forecast,
        "mae": mae,
        "rmse": rmse,
        "mape": mape,
    }


def _create_lag_features(values: np.ndarray, n_lags: int):
    X, y = [], []
    for i in range(n_lags, len(values)):
        X.append(values[i - n_lags : i])
        y.append(values[i])
    return np.array(X), np.array(y)


def _exp_smooth_predict(values: np.ndarray, alpha: float, steps: int) -> list[float]:
    level = values[0]
    for v in values[1:]:
        level = alpha * v + (1 - alpha) * level
    return [level] * steps


def _mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    mask = actual != 0
    if mask.sum() == 0:
        return 0.0
    return float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100)
