// Reading the forecaster's output. Kept out of the page so it can be tested
// without rendering a chart, and so the page file exports only its component.

/**
 * Whether a model's error figures mean anything.
 *
 * The forecaster holds back a slice of history to score each model against.
 * When the history is too short there is no slice, nothing is measured, and
 * every metric comes back null. That is not a perfect fit, it is an unmeasured
 * one — the distinction matters, because selection is lowest-error-wins and a
 * model reporting zero would win every time without anyone having checked it.
 *
 * MAPE is the deciding figure: MAE and RMSE are in the unit of the data and are
 * not comparable between datasets, so a model is "scored" exactly when it has a
 * MAPE. A real zero is a score and passes.
 */
export function wasScored(model) {
  return Boolean(model) && model.mape != null;
}
