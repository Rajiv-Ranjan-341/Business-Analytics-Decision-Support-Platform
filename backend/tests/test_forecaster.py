"""How the forecaster reports accuracy, and how it picks a winner.

The bug these guard against: when a model's hold-out slice came out empty, the
code reported mae = rmse = mape = 0.0 — a perfect score for a model that was
never tested. Selection is "lowest MAPE wins", so an untested model won every
time, on the shortest histories, where its single training example made it
least trustworthy.
"""

import pandas as pd
import pytest

from app.services.forecaster import forecast_time_series


def monthly(values, start="2024-01-01"):
    """One row per month, so resampling leaves exactly len(values) buckets."""
    dates = pd.date_range(start=start, periods=len(values), freq="MS")
    return pd.DataFrame({"when": dates, "amount": values})


def test_a_model_that_was_never_tested_reports_no_score():
    # Six points is the documented minimum. XGBoost uses 5 lags, leaving a
    # single training row and nothing to hold out.
    df = monthly([100, 120, 110, 130, 125, 140])

    result = forecast_time_series(df, "when", "amount", periods=3)

    assert result["models"]["xgboost"]["mape"] is None
    assert result["models"]["xgboost"]["mae"] is None
    assert result["models"]["xgboost"]["rmse"] is None


def test_an_unscored_model_cannot_win():
    """A score of zero used to mean "perfect" and "never measured" alike."""
    df = monthly([100, 120, 110, 130, 125, 140])

    result = forecast_time_series(df, "when", "amount", periods=3)

    assert result["best_model"] == "Exponential Smoothing"
    assert result["models"]["exp_smoothing"]["mape"] is not None


def test_with_real_history_both_models_are_scored_and_the_better_one_wins():
    df = monthly([100 + (i * 5) + (i % 4) * 11 for i in range(36)])

    result = forecast_time_series(df, "when", "amount", periods=6)

    xgb = result["models"]["xgboost"]["mape"]
    exp = result["models"]["exp_smoothing"]["mape"]
    assert isinstance(xgb, float) and isinstance(exp, float)

    expected = "XGBoost" if xgb <= exp else "Exponential Smoothing"
    assert result["best_model"] == expected


def test_the_forecast_returned_belongs_to_the_winning_model():
    df = monthly([100 + (i * 5) + (i % 4) * 11 for i in range(36)])

    result = forecast_time_series(df, "when", "amount", periods=6)

    key = "xgboost" if result["best_model"] == "XGBoost" else "exp_smoothing"
    assert result["forecast"] == result["models"][key]["forecast"]


def test_too_little_history_is_refused_rather_than_guessed():
    result = forecast_time_series(monthly([100, 120, 110]), "when", "amount")

    assert "error" in result
    assert "forecast" not in result


def test_it_returns_the_number_of_periods_asked_for():
    df = monthly([100 + i * 3 for i in range(24)])

    result = forecast_time_series(df, "when", "amount", periods=9)

    assert len(result["forecast"]) == 9
    assert all(point["lower"] <= point["value"] <= point["upper"] for point in result["forecast"])
