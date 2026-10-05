# BizOptAI — system architecture

A reference for anyone who needs to understand how this project is built: what it
does, how each part works, why each technology was chosen, and where it is weak.

Figures in this document were read from the code, not from the original plan.
The backend is about 2,300 lines of Python; the frontend is about 6,000 lines of
JavaScript across 31 source files.

---

## 1. What the project is

### The problem

A shop's sales report tells the owner what sold. It does not tell them what
*earned*. Those are different questions, and the gap between them is where small
retailers lose money: a product can be the second-biggest seller in the business
and return almost nothing, because a standing discount has quietly eaten its
margin. Nothing in a normal sales export makes that visible.

BizOptAI reads a retail sales file and answers three questions about it:

| Question | Where it is answered |
|---|---|
| What happened? | Dashboard, Products, Diagnosis |
| What will happen? | Forecasting |
| What should I look at? | What-if, Assistant, Summary |

The sample dataset makes the point concretely. Across 9,994 rows of US retail
transactions, `HON 5400 Series Task Chairs` sold **$21,870.58** and kept
**$0.00** — the fourth-biggest seller in the business, earning nothing. One place
above it, a Cisco videoconferencing system sold $22,638 and *lost* $1,811.
A sales report ranks both near the top.

### What it is not

It is a reporting and diagnostic tool, not an advisor. It decomposes what
changed; it does not claim to know why. It ranks what each product earned; it
does not tell you to delist anything. That distinction is deliberate and is
enforced in the interface copy as well as in this document.

---

## 2. System architecture

### Shape

```
┌──────────────────────────── BROWSER ────────────────────────────┐
│  React 19 SPA (Vite)                                             │
│                                                                  │
│  pages/          10 routes: Landing, Dashboard, Upload,          │
│                  Forecast, Customers, Products, Diagnosis,       │
│                  What-if, Assistant, Summary                     │
│  components/     Layout · Shared · Upload · Dashboard            │
│  lib/            format.js (money, chart palette)                │
│                  motion.js (rAF ticker, reduced-motion)          │
│  api/client.js   one axios instance, baseURL "/api"              │
└───────────────────────────────┬──────────────────────────────────┘
                                │  HTTP/JSON
                  Vite dev proxy │  /api → localhost:8000
                                ▼
┌──────────────────────────── FASTAPI ─────────────────────────────┐
│                                                                   │
│  api/        thin HTTP handlers. Validate, fetch mappings,        │
│              delegate, translate errors. NO analytics here.       │
│              upload · dashboard · forecast · customers ·          │
│              products · diagnosis · simulator                     │
│                                ↓                                  │
│  services/   all the analytics. Pure functions over a DataFrame.  │
│              No FastAPI imports, no database access.              │
│              data_processor · kpi_calculator · forecaster ·       │
│              segmentation · profitability · diagnosis ·           │
│              simulator · explainer                                │
│                                ↓                                  │
│  models/     SQLAlchemy ORM: Dataset, ColumnMapping               │
│  schemas/    Pydantic request/response contracts                  │
└───────────────────────────────┬───────────────────────────────────┘
                                ▼
         ┌──────────────────┐        ┌─────────────────────┐
         │  SQLite          │        │  data/uploads/      │
         │  bizoptai.db     │        │  the raw files,     │
         │  metadata only   │        │  named by UUID      │
         └──────────────────┘        └─────────────────────┘
```

### The key separation

**The database never stores your sales data.** It stores *metadata* about a file
— its name, row count, column types, and what each column means. The file itself
stays on disk, and every analytics request re-reads it with pandas.

This is unusual and worth defending. It means no ETL step, no schema migration
when someone uploads a file with different columns, and no risk of the database
and the file disagreeing. The cost is that every request pays the parse: reading
the 2.3 MB sample takes a noticeable fraction of a second, and a 50 MB file would
be worse. For a single-user analytical tool that is the right trade; for a
multi-tenant product it would need a cache or a columnar store.

### Request lifecycle

Taking `GET /api/products/{id}/profitability` as the example:

1. `api/products.py` loads the `Dataset` row and its `ColumnMapping` rows.
2. If the roles it needs are unmapped, it returns **400** with a message naming
   what is missing in plain language.
3. `read_uploaded_file(dataset.file_path)` parses the CSV into a DataFrame.
4. `services/profitability.py` does the analysis over that DataFrame and the
   mappings dict.
5. FastAPI serialises the returned dict to JSON.

The service layer has no idea FastAPI exists. That is what makes it testable in
isolation and is the main reason the project is structured this way.

---

## 3. The keystone: the column mapping system

This is the single most important design decision in the project, and the one
most worth explaining.

### The problem it solves

Every shop's export has different column names. "Sales", "Revenue", "Net Amount",
"Total". If the analytics code says `df["Sales"]`, the product works for exactly
one file.

### How it works

A small table maps **business roles** to **column names**, per dataset:

```
ColumnMapping
  id, dataset_id, role, column_name

  (5, "revenue",     "Sales")
  (5, "date",        "Order Date")
  (5, "product",     "Product Name")
```

There are ten roles: `date`, `revenue`, `profit`, `quantity`, `customer_id`,
`product`, `category`, `region`, `discount`, `cost`.

Every service takes a `mappings` dict and reads through it:

```python
revenue_col = mappings.get("revenue")
if revenue_col and revenue_col in df.columns:
    total_revenue = round(float(df[revenue_col].sum()), 2)
```

Note the **two-part guard** — the role is mapped *and* the mapped name is really
a column in this file. A mapping can go stale if a file is replaced.

### Detection

`data_processor.suggest_column_roles()` guesses the mapping by lowercasing every
column name and matching it against a keyword list per role, first match wins:

```python
"revenue": ["sales", "revenue", "amount", "total"],
"date":    ["date", "order date", "order_date", "orderdate", "ship date"],
```

This is **exact matching on the whole name**, not fuzzy or substring matching.
`"Sales"` matches; `"Net Sales 2024"` would not. It gets all nine roles right on
the sample dataset, and it is the first thing to improve if real files start
failing.

Detected roles are **saved at upload time**, so a freshly uploaded file works
immediately. The Column meanings screen overrides them — detection is a starting
point, not a decision.

---

## 4. Backend components

### 4.1 `data_processor.py` — reading files

Parses CSV and Excel, and profiles columns.

**Encoding.** Sales exports are rarely UTF-8. Excel on Windows writes cp1252, and
the public Superstore dataset contains 427 non-breaking spaces that are not valid
UTF-8 at all. The reader tries encodings in order of how likely each is to be
*correct*, not merely to parse:

```python
CSV_ENCODINGS = ("utf-8-sig", "cp1252", "latin-1")
```

`latin-1` decodes any byte sequence whatsoever, so it can only ever be the last
resort — putting it first would silently mangle genuine UTF-8.

**Normalisation.** Non-breaking spaces are replaced with ordinary spaces. This
matters more than it sounds: `"Conference\xa0phone"` and `"Conference phone"` are
different strings, so one product would split into two rows the moment the data
is grouped, halving its apparent revenue.

Also provides `get_column_info`, `get_column_stats`, `get_preview_rows`,
`count_duplicates`, and the type detectors used by the Column health tab.

### 4.2 `kpi_calculator.py` — the headline numbers

| KPI | Formula |
|---|---|
| `total_revenue` | `df[revenue].sum()` |
| `total_profit` | `df[profit].sum()` |
| `profit_margin` | `total_profit / total_revenue * 100` |
| `avg_order_value` | `total_revenue / len(df)` |
| `total_orders` | `len(df)` |
| `unique_customers` | `df[customer].nunique()` |
| `total_units_sold` | `df[quantity].sum()` |
| `avg_discount` | `df[discount].mean() * 100` |

Growth is computed by `_compute_growth`: group rows by calendar month, take the
**last two months that appear in the file**, and compare them.

Unmapped roles produce **absent keys**, not nulls — the frontend renders only
what it is given.

Also computes the time series, category and region breakdowns, and the monthly
trend. `compute_time_series` resamples, so a month with no sales appears as zero;
`compute_monthly_trend` does not, so such a month is simply missing.

### 4.3 `forecaster.py` — what next month looks like

Two models compete, and the more accurate one wins.

**Preparation.** Group history into buckets (`daily → "D"`, `weekly → "W"`,
`monthly → "MS"`, anything else falls back to monthly) and sum within each. Needs
at least **6** buckets or it returns an error.

**Model A — XGBoost on lagged values.** Features are the previous
`n_lags = min(6, len(values) - 1)` observations; the target is the next value.
Hyperparameters: `n_estimators=100`, `max_depth=4`, `learning_rate=0.1`,
`random_state=42`. Forecasting is recursive — each prediction is appended to the
window and feeds the next step.

**Model B — single exponential smoothing.** Hand-written, not statsmodels:

```python
level = alpha * value + (1 - alpha) * level
```

`alpha` is grid-searched over `[0.1, 0.2, 0.3, 0.5, 0.7, 0.9]`. Because it is
*single* smoothing with no trend or seasonal term, its forecast is a **flat line**
at the final level.

**Selection.** Lowest MAPE wins, ties to XGBoost — but **only among models that
were actually measured**. A history short enough that the 80/20 split leaves no
hold-out produces `None` metrics rather than zeros, and a model with no score
cannot win on accuracy. If neither could be measured, the simpler model is
returned, since a gradient boosting fit on one example is the less defensible of
the two. The page reports which model won and its error, because a forecast whose
accuracy is hidden is worse than no forecast.

On the full sample dataset (48 months) exponential smoothing wins with **27.4%
MAPE** against XGBoost's 36.8%. On a three-month extract the same code scores
185%, which is why the dataset size matters so much.

### 4.4 `segmentation.py` — grouping customers

Classic **RFM** plus **K-means**.

- **Recency** — days since that customer's last order, measured against
  `max(date) + 1 day` *in the file*.
- **Frequency** — number of rows for that customer.
- **Monetary** — total revenue from that customer.

Scaled with `StandardScaler` (z-scores, equal weight to all three), then K-means
for every `k` in `2 … max_k`, keeping whichever **k** scores the highest
silhouette. Needs at least **4** customers.

Clusters are named by comparing each cluster's mean against the population mean
on all three axes, through a fixed ladder: Champions, Loyal Customers, Recent
Customers, At Risk (High Value), Needs Attention, Can't Lose Them, Hibernating.

### 4.5 `profitability.py` — what each product earned

Groups by product; sums revenue, profit and quantity; computes margin and
revenue share. Then tags products:

| Tag | Rule |
|---|---|
| `loss_making` | `profit < 0` |
| `high_revenue_low_margin` | `revenue >= median(revenue)` and `margin < 5%` |
| `high_margin` | `margin > 30%` |
| `top_sellers` | the five largest by revenue |

The simplest service in the project, and the one that carries the product's core
claim.

### 4.6 `diagnosis.py` — where a change came from

Takes the last two months present in the file and decomposes the change in a
metric across each available dimension (category, region, customer, product).

For every segment within a dimension:

```python
change          = current_value - previous_value
contribution_pct = change / total_change * 100
```

Segments are ranked by **absolute change**, so a tiny segment with a huge
percentage swing cannot top the list. The top ten per dimension are returned, and
the five largest across all dimensions become `top_contributors`.

This is an **accounting identity, not a causal claim** — the segment deltas sum
to the total delta by construction. The page says so in its own subtitle.

### 4.7 `simulator.py` — what-if

Applies adjustments to a copy of the data and recomputes the totals.

The interesting part is discounting. A price cut is assumed to lift demand with
a fixed elasticity of **-1.5** — cut 1%, sell about 1.5% more:

```python
elasticity = -1.5
demand_effect = 1 + (pct / 100) * abs(elasticity)
```

Produces a verdict of `positive`, `cautious` or `negative`. "Cautious" exists for
the case that matters most: revenue up, profit down.

### 4.8 `explainer.py` — which columns move revenue

Trains an `XGBRegressor` (same hyperparameters as the forecaster) with revenue as
the target, then explains it with `shap.TreeExplainer` — exact TreeSHAP for tree
ensembles. Features are quantity, discount, category and region.

**Profit is deliberately excluded**, as is any column mapped to the target
itself. Profit is revenue minus cost, so using it to explain revenue restates the
target: the model leans on it, SHAP crowns it the biggest driver, and the answer
is a tautology. On the sample dataset the honest answer is quantity, then office
supplies as a category, then discount.

Categorical columns are one-hot encoded with `drop_first=True`.
Importance is `mean(|SHAP value|)` per column. Needs at least 10 rows and two
feature columns. Renders a beeswarm and a bar chart server-side with matplotlib
(`Agg` backend) and returns them base64-encoded.

---

## 5. Frontend components

### 5.1 Structure

| Path | Role |
|---|---|
| `pages/` | one component per route, owns its data fetching and state |
| `components/Layout/` | `Sidebar`, `DashboardLayout` — the app shell |
| `components/Shared/` | `Panel`, `PageHeader`, `DatasetSelector`, `Figure`, `LoadingSpinner` |
| `components/Upload/` | `FileUpload`, `DatasetList`, `DataPreview`, `ColumnMapping` |
| `components/Dashboard/` | `KPICards`, `SalesChart`, `CategoryBreakdown` |
| `lib/format.js` | every money/number string in the app |
| `lib/motion.js` | the motion system |
| `api/client.js` | one axios instance, one function per endpoint |

State is local to each page with `useState`/`useEffect`. There is no Redux, no
Zustand, no React Query — pages do not share state with each other, so a global
store would be ceremony with no payoff.

### 5.2 The design system

The identity is a **thermal receipt**: brown-black print on warm grey stock.

| Token | Value | Use |
|---|---|---|
| `ink` | `#2e241a` | all type, all positive money |
| `paper` | `#eae8e0` | page ground |
| `sheet` | `#f4f2ec` | raised surfaces, chart plots |
| `sticker` | `#f2e82b` | the markdown sticker — fields only, never text |
| `loss` | `#a52910` | **negative money only** |
| `kraft` | `#cfc3a9` | rules, borders, cardboard |

**There is deliberately no green.** Profit is plain ink, so red is the only
coloured exception on any screen — which is exactly why it lands. A rise wears
ink and an up-arrow; a fall wears red and a down-arrow, so direction never rests
on colour alone.

Type: **Barlow Condensed** for headings (supermarket shelf-edge signage),
**Archivo** for body and data, **Courier Prime** inside receipts only.

Every colour pairing was checked against WCAG AA; the weakest passing ratio in
the app is 5.01:1.

### 5.3 Chart colours

The categorical palette was validated with a colour-blindness checker rather than
chosen by eye:

```
series-1 #1d63b5   series-2 #b4531c   series-3 #7b3b63
series-4 #8a7414   series-5 #5b5bc4
```

All five pass for **bars, lines and stacked areas**, where only adjacent pairs
can be confused. Under the stricter **all-pairs** test — scatter and bubble,
where any two marks can sit side by side — only the **first three** pass: ochre
and sienna collapse to a deuteranopic ΔE of 0.3. So scatter charts cap at three
colour-coded groups and fold the rest into "Other". That cap is measured, not a
matter of taste.

### 5.4 Motion

Motion either answers something the user did or shows that their data arrived. It
never plays on scroll by itself.

- **Figures count up** when data lands, written straight to the DOM from one
  `requestAnimationFrame` pass, so the component does not re-render while it runs.
- **Panels feed out** like paper off a printer, staggered down the page.
- **The sidebar sticker slides** between items rather than blinking.
- **Chart series draw in** over 700ms.

All of it is disabled under `prefers-reduced-motion`, including the Recharts
animations, which ignore that setting by default and had to be wrapped.

---

## 6. Technology choices

| Choice | Why | What it costs |
|---|---|---|
| **FastAPI** | Automatic OpenAPI docs at `/docs`, Pydantic validation, async-ready, minimal boilerplate. | Younger ecosystem than Django; no admin, no ORM, no auth included. |
| **SQLAlchemy + SQLite** | Zero setup — the database is one file. The ORM abstraction means moving to PostgreSQL is a connection-string change. | Single-writer. Fine for one user, wrong for a deployed multi-user product. |
| **pandas** | The analytics are table operations: group, aggregate, resample, pivot. Writing those by hand would be slower and buggier. | Everything is in memory, so file size is bounded by RAM. |
| **XGBoost** | Strong on small tabular data, trains in milliseconds at this scale, and `TreeExplainer` gives exact SHAP values. | **Trees cannot extrapolate** — predictions are bounded by the training range, so a growing series flattens out. |
| **Hand-written exponential smoothing** | No statsmodels dependency, and the Windows install for Prophet/ARIMA was a known problem. Transparent enough to explain line by line. | No trend or seasonal component, so it forecasts a flat line. |
| **scikit-learn** | K-means, silhouette and StandardScaler are standard, well-documented implementations. | — |
| **SHAP** | Model-agnostic, theoretically grounded (Shapley values), and exact for trees. | Explains the *model*, not reality. O(n) over every row inside the request. |
| **React 19 + Vite** | Instant hot reload, modern build, huge ecosystem. | — |
| **JavaScript, not TypeScript** | A deliberate decision to cut the learning curve while learning web development. | No compile-time safety; prop shapes are undocumented. |
| **Tailwind CSS 4** | The `@theme` block makes the design tokens real CSS variables that generate utilities, so the palette is defined in exactly one place. | Verbose class strings in the markup. |
| **Recharts** | Declarative React components, far less code than D3 for standard charts. | Less control than D3 for anything unusual. |
| **No state library** | Pages do not share state. Local `useState` is sufficient. | Would need revisiting if cross-page state appears. |

---

## 7. Known limitations

Stated plainly, because being first to name a weakness is stronger than being
caught by it.

### Forecasting

- **The two models are scored on different test sets.** XGBoost splits the lag
  matrix; smoothing splits the raw series. The MAPE comparison is not
  like-for-like.
- **The smoothing alpha is tuned on the test set and then scored on it**, which
  is selection leakage and biases its reported error optimistically.
- **The confidence intervals are not statistical.** They are a multiple of the
  standard deviation of the last 12 *observations*, not of forecast error, with
  hardcoded constants and no stated confidence level.
- **Nothing models seasonality.** No month or weekday features, no seasonal lags,
  a maximum of six lags — monthly data cannot see a yearly cycle.
- **Resampling fabricates zeros** for periods with no transactions, which are
  then learned as real observations but excluded from MAPE.

### Segmentation

- **Recency is measured against the file, not today**, so a file uploaded late
  looks healthy, and results are not comparable across datasets.
- **No log transform before scaling.** RFM is strongly right-skewed and K-means
  minimises squared Euclidean distance, so a few large customers dominate.
- **Silhouette alone chooses k**, and on skewed data it often peaks at k=2.
- **Frequency counts rows, not orders**, so line-item-level files inflate it.
- Nothing stops two clusters receiving the same label.

### KPIs

- **"Orders" are rows.** The app has no order-ID role, so on a line-item export
  `total_orders` overcounts and `avg_order_value` is really average revenue *per
  line item*.
- **Growth compares the last two months present in the file**, which need not be
  adjacent. January and June would be reported as month-over-month.
- **A partial final month** is compared against a full one with no normalisation.
- **Negative-base growth inverts sign** — profit improving from −100 to −50 shows
  as −50%.

### Diagnosis

- **Contribution is arithmetic, not causal.** The page says so, and it is the
  most important caveat in the product.
- **Shares can exceed 100%.** The denominator is the *net* change, so if one
  segment falls 100k while another rises 95k, the net is −5k and the first
  segment's share is +2000%.
- **`top_contributors` can double-count the same money** — the dimensions are not
  independent partitions, so one event may appear as a category, a region and a
  customer.
- **No mix-versus-rate decomposition**: it cannot separate "we sold fewer" from
  "we sold cheaper".

### Explainability

- **SHAP explains the model, not reality.** A large SHAP value for discount does
  not license "cut discounts and revenue will rise".
- **No fit quality is reported.** The model trains on 100% of the data with no
  hold-out, so a user cannot tell whether the explanation is of a model that
  predicts anything at all.
- **`mean(|SHAP|)` destroys direction** — a feature that pushes revenue up for
  half the rows and down for the other half scores as highly as a consistent one.

### Fixed, and worth knowing about

Two defects in this list were found while writing this document and have since
been corrected. Both are covered by tests.

- An untested model used to report `mae = rmse = mape = 0.0`, which read as a
  perfect score and meant that on the shortest histories XGBoost won selection by
  construction. Unmeasured models now report `None` and cannot win.
- The explainability endpoint used to pass `profit` as a feature while predicting
  `revenue`. It no longer does, and mapping one column to two roles — which used
  to crash the model with a duplicate-column error — is now rejected cleanly.

### System

- **No authentication and no multi-tenancy.** Single user, single machine.
- **Every request re-parses the file.** No caching.
- **No frontend tests.** The backend has 14; the frontend has none.
- **SHAP runs synchronously inside the request handler** with no sampling cap.

---

## 8. Running it

```bash
# backend — http://localhost:8000, docs at /docs
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend — http://localhost:5173
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to port 8000. If the backend is not running,
every request returns **502** from the proxy.

```bash
cd backend && python -m pytest tests/ -q     # 14 tests
cd frontend && npx oxlint src && npm run build
```
