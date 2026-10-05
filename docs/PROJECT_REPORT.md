# BizOptAI — Retail Sales Analysis and Profit Diagnosis

**Project Report**

---

## Abstract

A retail sales report tells an owner what sold. It does not tell them what
earned. The two are routinely confused, and the gap between them is where small
retailers lose money: a product can be among the best sellers in the business and
return almost nothing, because a standing discount has quietly consumed its
margin. Nothing in a conventional sales export makes that visible.

BizOptAI is a web application that reads a retail sales file and reports what each
product actually earned. It provides descriptive analytics, month-over-month
decomposition, demand forecasting, customer segmentation, scenario simulation and
model explainability, through a column-mapping abstraction that allows it to
operate on any sales export rather than a single fixed schema.

Applied to a public dataset of 9,994 retail transactions, the system identified
**301 of 1,850 products operating at a loss**, and one product — a line of office
chairs — that was the fourth-largest seller by revenue while returning exactly
zero profit across four years. Two forecasting methods were implemented and
evaluated against held-back history, with the selected method achieving 27.4%
MAPE.

A benchmarking exercise undertaken during evaluation found that a seasonal naive
baseline outperformed both implemented models, at 22.3% MAPE. This result is
reported in full, along with the structural explanation for it, as it is more
informative than the headline accuracy figure alone.

---

## 1. Introduction

### 1.1 Problem statement

Small and medium retailers almost universally possess transactional sales data,
exported from a point-of-sale system or maintained in a spreadsheet. They rarely
possess the means to interrogate it. Commercial business intelligence platforms
assume dedicated analysts, fixed data schemas, and subscription budgets that are
difficult to justify at this scale.

The consequence is that decisions about pricing, discounting and product range
are made against revenue, because revenue is the figure that is visible. Revenue
and profitability diverge whenever discounting is uneven across a product range,
and that divergence is invisible in a sales ranking.

### 1.2 Motivation

Three observations motivated this work.

First, the analysis required is not sophisticated. Identifying unprofitable
products is a grouping and a subtraction. The barrier is not analytical
complexity but the absence of an accessible tool.

Second, every retailer's data is shaped differently. A system hardcoded to one
set of column names serves one retailer. This suggested that schema flexibility,
rather than analytical depth, was the design problem worth solving.

Third, business intelligence tools frequently overstate what they know. A tool
that reports a correlation as a cause, or a forecast without its error, is worse
than no tool, because it produces confident decisions on unsound grounds.

### 1.3 Objectives

| # | Objective | Status |
|---|---|---|
| O1 | Ingest sales data from any CSV or Excel export without a fixed schema | Met |
| O2 | Infer the business meaning of each column automatically | Met |
| O3 | Report trading performance at business and product level | Met |
| O4 | Decompose period-over-period change across multiple dimensions | Met |
| O5 | Forecast future demand and report forecast accuracy honestly | Met |
| O6 | Segment customers by purchasing behaviour | Met |
| O7 | Allow pricing and discount scenarios to be modelled before commitment | Met |
| O8 | Explain which factors most influence revenue | Met |
| O9 | Communicate findings in language appropriate to a non-analyst | Met |
| O10 | State the limits of every method presented | Met |

### 1.4 Scope

**Included:** file ingestion and validation, automatic column role inference,
descriptive analytics, product profitability analysis, month-over-month
diagnosis, demand forecasting, customer segmentation, scenario simulation,
model explainability, a composed written briefing, and a printable summary.

**Excluded:** authentication, multi-tenancy, live point-of-sale integration,
inventory management, automatic price setting, and any autonomous action.

The system reports and diagnoses. The decision remains with the user.

---

## 2. Background

### 2.1 Existing approaches

**Spreadsheets** are universal and flexible, but analysis must be rebuilt for
each question, pivot tables are error-prone at scale, and nothing prompts the
user toward the question they have not thought to ask.

**Commercial BI platforms** such as Power BI and Tableau are powerful and
general, but generality is the cost: the user must know what to build. They
assume an analyst.

**Vertical retail analytics products** provide the right analysis but typically
require integration with a supported point-of-sale system, excluding businesses
operating on exports and spreadsheets.

BizOptAI occupies the gap: opinionated about the questions, indifferent to the
schema, and requiring no integration.

### 2.2 Techniques applied

**RFM analysis** is a long-established marketing technique describing a customer
by how recently they purchased, how often, and how much they spent. It is
preferred here over demographic segmentation because it requires only
transactional data.

**K-means clustering** partitions observations into *k* groups by minimising
within-cluster variance. The **silhouette coefficient** measures how well-separated
the resulting clusters are, and is used here to select *k* without user input.

**Gradient boosted decision trees**, implemented as XGBoost, construct an ensemble
in which each successive tree corrects the residual error of its predecessors.
They are strong on small tabular datasets, which is the regime this project
operates in.

**Exponential smoothing** forecasts by maintaining a weighted average in which
recent observations carry more weight, governed by a smoothing parameter α.

**SHAP** applies Shapley values from cooperative game theory to attribute a
model's prediction among its input features, with an exact polynomial-time
algorithm available for tree ensembles.

---

## 3. System analysis and design

### 3.1 Architecture

A two-tier architecture with a four-layer backend.

```
┌─────────────────── React SPA (Vite) ───────────────────┐
│  10 routes · design tokens · chart layer · API client  │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON
┌───────────────────────────▼────────────────────────────┐
│  api/       route handlers — validation and delegation │
│  services/  all analytical logic — framework-free      │
│  models/    SQLAlchemy ORM entities                    │
│  schemas/   Pydantic request and response contracts    │
└──────────┬──────────────────────────────┬──────────────┘
           ▼                              ▼
   SQLite (metadata)            Filesystem (uploaded files)
```

The separation between `api/` and `services/` is strict: no analytical code
appears in a route handler, and no service imports FastAPI. Each analytical
function is therefore a pure function over a DataFrame and a mapping dictionary,
testable without starting a web server.

### 3.2 The central design decision: column mapping

The requirement to accept any retailer's export rules out referencing column
names directly. The solution is an indirection table associating **business
roles** with **column names**, per dataset:

```
role          column_name
────────────────────────────
revenue       Sales
date          Order Date
product       Product Name
```

Analytical code reads through this mapping rather than naming columns:

```python
revenue_col = mappings.get("revenue")
if revenue_col and revenue_col in df.columns:
    total = df[revenue_col].sum()
```

Ten roles are supported. Roles are inferred on upload by normalising column names
and matching against a keyword list, and the inferred mapping is persisted
immediately so that analysis is available without user intervention. The user may
override any assignment.

This decision propagates everywhere. Every service signature accepts a mappings
dictionary; every analysis guards on both the role being mapped and the mapped
column being present.

### 3.3 Data persistence strategy

The database stores **metadata about** an uploaded file — its name, dimensions,
column types and role mappings — and never the transactional rows themselves.
The file remains on disk under a generated unique name, and each analytical
request re-reads it.

The advantage is that no extraction or transformation step is required, no schema
migration is needed when a differently-shaped file is uploaded, and the database
cannot drift out of agreement with the file. The cost is that every request pays
the parsing time, and file size is bounded by available memory. For single-user
analytical use this trade favours simplicity; a multi-user deployment would
require a caching layer.

---

## 4. Implementation

The backend comprises approximately 2,300 lines of Python; the frontend
approximately 6,000 lines of JavaScript across 31 source files.

### 4.1 Ingestion

Sales exports are frequently not UTF-8 encoded. Excel on Windows writes
Windows-1252 by default, and the public dataset used for evaluation contains 427
non-breaking space characters that are invalid UTF-8. Three encodings are
attempted in order of likelihood of correctness — `utf-8-sig`, `cp1252`,
`latin-1` — with Latin-1 last because it decodes arbitrary bytes and would
silently corrupt genuine UTF-8 if attempted first.

Non-breaking spaces are normalised to ordinary spaces. This is not cosmetic:
the character is invisible but distinct, so an affected product name would split
into two groups during aggregation and report half its true revenue.

### 4.2 Descriptive analytics

Eight headline figures are computed by aggregation. Any figure whose source
column is unmapped is omitted from the response rather than reported as zero, so
that the interface renders only what is genuinely known.

Product profitability aggregates by product and applies four classification
rules: negative profit, above-median revenue with margin below 5%, margin above
30%, and the five largest by revenue.

### 4.3 Diagnosis

Month-over-month change is decomposed across each available dimension. For each
segment, contribution is its change divided by the aggregate change. Segments are
ranked by absolute change rather than percentage change, preventing a negligible
segment with a large proportional swing from dominating.

Applied to the evaluation dataset:

| November → December 2017 | Change | Share |
|---|---:|---:|
| Technology | −27,934 | 80.7% |
| Furniture | −5,649 | 16.3% |
| Office Supplies | −1,035 | 3.0% |
| **Total** | **−34,619** | **100.0%** |

The shares sum to 100% by construction. This is an accounting identity, and the
interface states so explicitly: the decomposition identifies where a change
occurred, not what caused it.

### 4.4 Forecasting

Two methods compete. The series is first aggregated into daily, weekly or
monthly buckets.

**Gradient boosted trees.** The series is converted into a supervised learning
problem by a sliding window: each training row holds the preceding six
observations, and the target is the seventh. Forty-eight monthly observations
therefore yield 42 training rows. An XGBoost regressor (100 estimators, maximum
depth 4, learning rate 0.1) is fitted, and multi-step forecasts are produced
recursively, each prediction appended to the window to generate the next.

**Exponential smoothing.** A level is maintained as
`level = α·observation + (1−α)·level`, with α selected from a grid by
minimising error on held-back history.

Both are evaluated on a chronological 80/20 split and the method with the lower
MAPE is selected. The selected method and its error are reported to the user, on
the principle that a forecast presented without its accuracy invites misplaced
confidence.

### 4.5 Customer segmentation

Transaction rows are aggregated to one row per customer, described by recency
(days since last purchase, measured against the latest date in the file),
frequency (transaction count) and monetary value (total spend).

These three measures occupy incompatible scales — days, counts and currency — so
each is standardised to a z-score before clustering. K-means is then fitted for
each candidate *k*, and the value maximising the silhouette coefficient is
selected. Clusters are named by comparing their means against the population
means on each axis.

### 4.6 Scenario simulation

Adjustments are applied to a copy of the data and totals recomputed. A discount
change is translated into a demand change through a price elasticity of −1.5: a
one percent price reduction is assumed to increase demand by one and a half
percent. The outcome is classified as positive, cautious or negative, where
*cautious* denotes the case of rising revenue with falling profit — the case the
tool exists to surface.

### 4.7 Explainability

An XGBoost regressor is fitted with revenue as the target, and SHAP's
`TreeExplainer` attributes predictions to inputs. Mean absolute SHAP value per
feature provides a global ranking.

**Feature selection is deliberately restricted.** Profit is excluded, as is any
column mapped to the target. Profit is revenue less cost, making it a
near-deterministic function of the target; including it produces a model that
trivially recovers the target and an explanation that is tautological. With it
excluded, the ranking on the evaluation dataset is quantity, then office supplies
as a category, then discount — factors a retailer can act upon.

### 4.8 Interface

Ten routes implemented as a single-page application. The visual design uses a
six-value token system. Colour carries information rather than decoration:
negative monetary values are the only coloured exception on any screen, with
positive values rendered in the same ink as surrounding text, and direction
additionally indicated by iconography so that meaning never rests on colour alone.

Chart colours were selected against a colour-vision-deficiency validator rather
than chosen by eye. Five categorical colours pass for bar and line charts, where
only adjacent pairs may be confused; only three pass the stricter all-pairs test
required for scatter plots, where any two marks may appear side by side. Scatter
charts therefore cap at three colour-coded groups, folding the remainder into a
neutral category.

---

## 5. Testing and results

### 5.1 Automated testing

23 automated tests cover file ingestion including encoding fallback and character
normalisation, column mapping persistence and override, error message quality
across seven endpoints, forecast scoring and model selection, and explainability
feature selection.

Each defect described in §5.4 was first reproduced as a failing test, then fixed,
following a test-first approach.

### 5.2 Functional results

The evaluation dataset comprises 9,994 transaction rows: 5,009 orders placed by
793 customers across 1,850 products, between January 2014 and December 2017.

| Measure | Result |
|---|---:|
| Total revenue | $2,297,200.86 |
| Total profit | $286,397.02 |
| Profit margin | 12.5% |
| Products analysed | 1,850 |
| **Products operating at a loss** | **301** |

The single most illustrative finding: `HON 5400 Series Task Chairs` generated
**$21,870.58** of revenue across four years and returned **exactly zero profit**.
It is the fourth-largest product by revenue. Two positions above it, a
videoconferencing system generated $22,638 of revenue at a **loss** of $1,811.

Both products appear near the top of any sales ranking. Neither is visible as a
problem without comparing revenue against profit at product level, which is
precisely the comparison this system was built to make.

### 5.3 Forecasting accuracy, and a negative result

The implemented methods were evaluated on a chronological 80/20 split of 48
monthly observations — 38 training, 10 held back.

| Method | MAPE |
|---|---:|
| Seasonal naive — repeat the same month last year | **22.3%** |
| Linear trend extrapolation | 26.3% |
| Mean of trailing 12 months | 27.2% |
| **Exponential smoothing (implemented, selected)** | **27.4%** |
| Mean of all history | 31.3% |
| **XGBoost (implemented)** | **36.8%** |
| Naive — repeat last month | 65.8% |

**The gradient boosting model is outperformed by four trivial baselines, and the
selected model is outperformed by three.** This is reported rather than omitted,
because the explanation is structural and instructive.

A decision tree predicts by returning a value stored in a leaf, and leaf values
are derived from training data. **A tree ensemble therefore cannot produce a
prediction outside the range of its training targets** — here, $11,951 to
$118,448. It cannot extrapolate a trend by construction.

Two further factors compound this. Multi-step forecasts are generated
recursively, so by the sixth horizon the input window comprises one observed
month and five of the model's own predictions, and early error propagates
through all subsequent steps. And no feature encodes seasonality: with a maximum
of six lags on monthly data, an annual cycle is not representable — which is
exactly the regularity the seasonal naive baseline exploits.

The appropriate conclusion is not that machine learning is unsuitable for
forecasting, but that **this model specification is unsuitable for this series**,
and that benchmarking against naive baselines is necessary to detect it. Adding
month-of-year and lag-12 features would allow the model to represent the
seasonality it is currently blind to.

### 5.4 Defects identified and corrected

Two defects were identified during a systematic review and corrected.

**Unmeasured models reported perfect accuracy.** Where the training split left no
held-back observations, the implementation reported MAE, RMSE and MAPE as 0.0.
Because selection minimises MAPE, an unevaluated model won selection on every
short series — precisely where a model fitted to a single training example is
least trustworthy. Unmeasured models now report no score and are excluded from
accuracy-based selection.

**Target leakage in the explainability module.** Profit was supplied as a model
input while revenue was the prediction target. As profit is revenue less cost,
the model recovered the target almost deterministically and SHAP correctly
identified profit as the dominant factor — a true but vacuous result. Profit, and
any column mapped to the target, is now excluded. Investigation additionally
revealed that mapping a single column to two roles caused an unhandled exception;
this is now rejected cleanly.

---

## 6. Limitations

These are stated in full. Several are inherent to the methods; identifying them
is part of the result.

**Forecasting.** No seasonality is modelled. Confidence intervals are derived
from the standard deviation of recent observations rather than from forecast
error, and are not statistical prediction intervals. The two methods are
evaluated on slightly different held-back sets, so their comparison is not
strictly like-for-like. The smoothing parameter is selected on the same data used
to report its error, which biases that figure optimistically.

**Segmentation.** Recency is measured against the latest date in the file rather
than the present date, so results are not comparable across files with different
end dates. RFM measures are right-skewed and are standardised without a
logarithmic transform, so a small number of high-value customers exert
disproportionate influence on a distance-based clustering method. Frequency
counts transaction rows rather than distinct orders.

**Key performance indicators.** No order identifier role exists, so order counts
are row counts and average order value is in practice average revenue per
transaction line. Growth compares the last two months present in the data, which
need not be calendar-adjacent, and a partial final month is compared against a
complete one without normalisation.

**Diagnosis.** Contribution is arithmetic and not causal. Because the denominator
is a net change, individual shares may exceed 100% when segments move in opposite
directions. The combined top-contributor list draws from dimensions that are not
independent partitions, so a single underlying event may appear several times.

**Explainability.** SHAP attributes a model's behaviour, not real-world
causation. No measure of model fit is reported alongside the explanation.

**System.** No authentication or multi-tenancy. Every request re-parses the
source file. No automated frontend tests exist.

---

## 7. Future work

**Immediate.** Add month-of-year and lag-12 features so the forecasting model can
represent annual seasonality, and include a seasonal naive baseline as a third
competing method so that any model must demonstrably beat it. Apply a logarithmic
transform to RFM measures before standardisation. Introduce an order identifier
role so order-level metrics are correct.

**Medium term.** Automated frontend testing. Caching of parsed datasets. Export
to CSV and image. Authentication and per-user isolation, as prerequisites for any
deployment beyond a single machine.

**Longer term.** Migration to PostgreSQL. Containerised deployment. A continuous
integration pipeline. Mix-versus-rate decomposition in diagnosis, separating
volume effects from price effects.

---

## 8. Conclusion

BizOptAI demonstrates that the analysis small retailers most need is not
analytically sophisticated, and that the substantive engineering problem is
schema flexibility rather than modelling complexity. The column mapping
abstraction allows a single implementation to operate on any sales export, and
the strict separation between HTTP handling and analytical logic kept every
analytical function independently testable.

All ten stated objectives were met. Applied to a public dataset of 9,994
transactions the system identified 301 unprofitable products and, more
pointedly, a product selling $21,870 while returning nothing — a result invisible
in any revenue-ordered report.

The most instructive outcome was a negative one. Benchmarking revealed that the
gradient boosting forecaster is outperformed by a one-line seasonal baseline, for
a reason inherent to decision trees: they cannot predict beyond the range of
their training data. That finding, and the two defects identified and corrected
during review, are reported here in full. A project that documents the limits of
its own methods is more useful than one that reports only its successes, and
locating those limits required more rigour than producing the headline figures
did.

---

## References

1. IEEE. *IEEE Recommended Practice for Software Requirements Specifications*
   (IEEE 830-1998).
2. Chen, T. and Guestrin, C. (2016). XGBoost: A Scalable Tree Boosting System.
   *Proceedings of KDD '16*.
3. Lundberg, S. and Lee, S. (2017). A Unified Approach to Interpreting Model
   Predictions. *Advances in Neural Information Processing Systems 30*.
4. Rousseeuw, P. (1987). Silhouettes: a graphical aid to the interpretation and
   validation of cluster analysis. *Journal of Computational and Applied
   Mathematics*, 20.
5. Hyndman, R. and Athanasopoulos, G. *Forecasting: Principles and Practice*,
   3rd edition. OTexts.
6. Hughes, A. (1994). *Strategic Database Marketing*. Probus Publishing.
   (RFM analysis.)
7. W3C. *Web Content Accessibility Guidelines (WCAG) 2.1*.
8. Kaggle. Sample Superstore dataset.

---

## Appendix A — Technology stack

| Component | Version | Rationale |
|---|---|---|
| FastAPI | 0.141.1 | Automatic OpenAPI documentation, Pydantic validation, minimal boilerplate |
| SQLAlchemy | 2.0.50 | ORM abstraction permitting a later database change without query rewrites |
| SQLite | bundled | Zero configuration; appropriate for single-user operation |
| pandas | 2.2.3 | The analytical workload is tabular aggregation |
| NumPy | 2.2.2 | Numerical operations underlying pandas and scikit-learn |
| scikit-learn | 1.9.0 | K-means, silhouette coefficient, standardisation, metrics |
| XGBoost | 3.3.0 | Strong on small tabular data; exact SHAP support |
| SHAP | 0.52.0 | Theoretically grounded attribution with an exact tree algorithm |
| Matplotlib | — | Server-side plot rendering, headless backend |
| React | 19.2.8 | Component model and ecosystem |
| Vite | 8.2.2 | Fast development server and build |
| Tailwind CSS | 4.3.3 | Design tokens defined once as CSS variables |
| Recharts | 3.10.1 | Declarative charting for React |
| React Router | 7.18.2 | Client-side routing |
| Axios | 1.19.0 | HTTP client |

## Appendix B — Repository structure

```
BizOptAI/
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI application, CORS, startup
│   │   ├── config.py          Paths and limits
│   │   ├── database.py        Engine and session
│   │   ├── models/            SQLAlchemy entities
│   │   ├── schemas/           Pydantic contracts
│   │   ├── api/               7 route modules, 18 endpoints
│   │   └── services/          8 analytical modules
│   ├── tests/                 23 automated tests
│   └── data/sample/           Evaluation dataset
├── frontend/
│   └── src/
│       ├── pages/             10 routes
│       ├── components/        Layout, Shared, Upload, Dashboard
│       ├── lib/               Formatting and motion
│       └── index.css          Design tokens
└── docs/
    ├── ARCHITECTURE.md
    ├── SRS.md
    └── PROJECT_REPORT.md
```
