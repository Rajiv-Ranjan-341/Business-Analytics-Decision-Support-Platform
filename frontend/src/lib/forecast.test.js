import { describe, expect, it } from 'vitest';
import { wasScored } from './forecast';

// The forecaster holds back a slice of history to score each model against.
// When the history is too short there is no slice, nothing is measured, and the
// backend reports null for all three metrics.
//
// It used to report 0.0 instead, which was worse than useless: selection is
// lowest-MAPE-wins, so the model that was never measured won every time, and
// the page printed "0.00%" under it — a perfect score for a model nobody had
// checked. This function is the frontend half of that fix.

describe('wasScored', () => {
  it('accepts a model that was measured', () => {
    expect(wasScored({ mae: 412.5, rmse: 503.1, mape: 27.3 })).toBe(true);
  });

  it('rejects a model that was never measured', () => {
    expect(wasScored({ mae: null, rmse: null, mape: null })).toBe(false);
  });

  // The distinction the whole fix turns on. A model really can score zero on a
  // tiny, perfectly-fitted history, and that is a measurement — it has to stay
  // tellable apart from "no measurement was taken".
  it('accepts a genuine zero, which is a score and not an absence', () => {
    expect(wasScored({ mae: 0, rmse: 0, mape: 0 })).toBe(true);
  });

  it('judges on the error figure alone, not on the other two', () => {
    // MAE and RMSE are reported in the unit of the data; only MAPE is the
    // comparable figure, and it is the one selection and the headline both read.
    expect(wasScored({ mae: null, rmse: null, mape: 31.8 })).toBe(true);
    expect(wasScored({ mae: 412.5, rmse: 503.1, mape: null })).toBe(false);
  });

  it('survives a missing model rather than throwing', () => {
    expect(wasScored(null)).toBe(false);
    expect(wasScored(undefined)).toBe(false);
  });
});
