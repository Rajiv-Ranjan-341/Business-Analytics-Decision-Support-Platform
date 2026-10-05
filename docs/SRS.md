# Software Requirements Specification

**BizOptAI — Retail Sales Analysis and Profit Diagnosis Platform**

| | |
|---|---|
| Version | 1.0 |
| Status | Implemented |
| Structure | Based on IEEE 830 |

---

## Table of contents

1. [Introduction](#1-introduction)
2. [Overall description](#2-overall-description)
3. [External interface requirements](#3-external-interface-requirements)
4. [Functional requirements](#4-functional-requirements)
5. [Non-functional requirements](#5-non-functional-requirements)
6. [Data requirements](#6-data-requirements)
7. [Constraints and assumptions](#7-constraints-and-assumptions)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the requirements for BizOptAI, a web application that
reads a retail sales file and reports what each product actually earned, as
distinct from what it sold for.

It is intended for the developer, the project supervisor, and any examiner
assessing whether the delivered system meets its stated requirements.

### 1.2 Scope

BizOptAI accepts a sales export in CSV or Excel format, establishes what each
column means, and provides eight analytical views over it: a KPI dashboard,
product profitability, month-over-month diagnosis, demand forecasting, customer
segmentation, a what-if simulator, a composed written briefing, and a printable
summary.

**In scope:** file ingestion, column role mapping, descriptive analytics,
forecasting, clustering, model explainability, and a printable report.

**Out of scope:** user authentication, multi-tenancy, real-time data feeds,
direct integration with point-of-sale systems, inventory management, automated
price setting, and any action taken on the user's behalf.

The system **reports and diagnoses**. It does not advise, and it does not act.

### 1.3 Definitions

| Term | Meaning |
|---|---|
| **Column role** | A business meaning assigned to a column: date, revenue, profit, quantity, customer, product, category, region, discount, cost |
| **Column mapping** | The stored association between a role and a column name, for one dataset |
| **Dataset** | One uploaded file plus the metadata the system holds about it |
| **Kept** | Profit. Used in the interface in preference to "profit" |
| **Sold** | Revenue |
| **Margin** | Profit expressed as a percentage of revenue |
| **RFM** | Recency, Frequency, Monetary — three measures describing a customer |
| **MAPE** | Mean Absolute Percentage Error, a forecast accuracy measure |
| **SHAP** | SHapley Additive exPlanations, a method for attributing a model's prediction to its inputs |

### 1.4 References

- IEEE 830-1998, Recommended Practice for Software Requirements Specifications
- `docs/ARCHITECTURE.md` — system architecture and design rationale
- Kaggle "Sample Superstore" dataset — the demonstration data

---

## 2. Overall description

### 2.1 Product perspective

BizOptAI is a self-contained two-tier web application. It has no dependency on
any external service, sends no data off the host machine, and requires no
network access beyond the browser reaching the local server.

```
Browser (React SPA)  ──HTTP/JSON──  FastAPI server  ──  SQLite  (metadata)
                                                    └──  Filesystem (uploaded files)
```

### 2.2 Product functions

| # | Function |
|---|---|
| F1 | Accept and validate a sales file |
| F2 | Detect and store what each column means |
| F3 | Report headline trading figures |
| F4 | Rank products by what they earned and flag the losers |
| F5 | Decompose a month-over-month change across dimensions |
| F6 | Forecast future periods and report the forecast's accuracy |
| F7 | Group customers by purchasing behaviour |
| F8 | Model the effect of price, discount, demand and cost changes |
| F9 | Rank which columns most influence revenue |
| F10 | Compose a written briefing from the figures |
| F11 | Produce a printable one-page summary |

### 2.3 User characteristics

**Primary user — a retail owner or manager.** Comfortable with a spreadsheet;
not a statistician. Needs plain language, no jargon, and must never be shown a
number without being able to see where it came from.

**Secondary user — an evaluator.** Needs the methods and their limitations to be
stated explicitly.

### 2.4 Operating environment

| | |
|---|---|
| Server | Python 3.10+, any OS |
| Client | A current desktop or mobile browser |
| Storage | Local filesystem and a single SQLite file |
| Network | Localhost only in the delivered configuration |

---

## 3. External interface requirements

### 3.1 User interface

Ten routes, served as a single-page application.

| Route | Purpose |
|---|---|
| `/` | Public landing page |
| `/dashboard` | Headline figures, trend, category and region breakdowns |
| `/upload` | File upload, file list, preview, column meanings |
| `/forecast` | Demand forecast and model comparison |
| `/customers` | Customer segments |
| `/products` | Product profitability |
| `/diagnosis` | Month-over-month decomposition |
| `/simulator` | What-if sliders and explainability |
| `/assistant` | Composed written briefing |
| `/summary` | Printable one-page summary |

**UI-1.** All interactive elements shall have a visible keyboard focus indicator.
**UI-2.** Text shall meet WCAG 2.1 AA contrast (4.5:1 body, 3:1 large).
**UI-3.** Meaning shall never be carried by colour alone.
**UI-4.** The interface shall be usable down to a 360 px viewport.
**UI-5.** All non-essential motion shall be disabled under `prefers-reduced-motion`.

### 3.2 Software interfaces

A REST API over JSON, 18 endpoints.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/datasets/upload` | Upload a file |
| GET | `/api/datasets/` | List datasets |
| GET | `/api/datasets/{id}` | Dataset detail, stats and preview |
| DELETE | `/api/datasets/{id}` | Delete a dataset and its file |
| GET | `/api/datasets/{id}/suggestions` | Detected column roles |
| GET / POST | `/api/datasets/{id}/mappings` | Read or replace column mappings |
| GET | `/api/dashboard/{id}/kpis` | Headline figures |
| GET | `/api/dashboard/{id}/timeseries` | Time series for a column |
| GET | `/api/dashboard/{id}/category-breakdown` | Totals by category |
| GET | `/api/dashboard/{id}/region-breakdown` | Totals by region |
| GET | `/api/dashboard/{id}/monthly-trend` | Revenue and profit by month |
| POST | `/api/forecast/{id}` | Run a forecast |
| POST | `/api/customers/{id}/segment` | Run segmentation |
| GET | `/api/products/{id}/profitability` | Product analysis |
| GET | `/api/diagnosis/{id}` | Month-over-month diagnosis |
| POST | `/api/simulator/{id}/what-if` | Run a scenario |
| GET | `/api/simulator/{id}/explain` | Feature importance |
| GET | `/api/health` | Liveness check |

**SI-1.** All responses shall be JSON.
**SI-2.** Request and response shapes shall be declared as Pydantic schemas and
published as OpenAPI at `/docs`.
**SI-3.** Failures shall use standard HTTP status codes: 400 for a bad request,
404 for a missing dataset.

---

## 4. Functional requirements

### 4.1 File ingestion

| ID | Requirement |
|---|---|
| **FR-1.1** | The system shall accept files with extension `.csv`, `.xlsx` or `.xls`, case-insensitively, and reject all others with HTTP 400. |
| **FR-1.2** | The system shall reject files larger than 50 MB with HTTP 400. |
| **FR-1.3** | The system shall store each uploaded file under a generated unique name, so that two files with the same original name cannot collide. |
| **FR-1.4** | The system shall attempt UTF-8, Windows-1252 and Latin-1 decoding in that order, and shall only report failure when all three fail. |
| **FR-1.5** | The system shall replace non-breaking spaces in column names and text values with ordinary spaces, so that otherwise-identical values group together. |
| **FR-1.6** | The system shall delete the stored file if it cannot be parsed. |
| **FR-1.7** | The system shall record, for each column: name, type, non-null count, null count, distinct count, and sample values. |
| **FR-1.8** | The system shall delete both the database record and the stored file when a dataset is deleted. |

### 4.2 Column mapping

| ID | Requirement |
|---|---|
| **FR-2.1** | The system shall support ten column roles: date, revenue, profit, quantity, customer_id, product, category, region, discount, cost. |
| **FR-2.2** | The system shall infer roles from column names on upload. |
| **FR-2.3** | The system shall persist the inferred mapping at upload time, so that analysis is available without further input. |
| **FR-2.4** | The system shall allow a user to review and change any mapping. |
| **FR-2.5** | Saving a mapping shall replace the stored set in full. |
| **FR-2.6** | No analysis shall assume a fixed column name; every analysis shall read through the mapping. |
| **FR-2.7** | Where a required role is unmapped, the system shall respond 400 and name the missing information in plain language. |

### 4.3 Dashboard

| ID | Requirement |
|---|---|
| **FR-3.1** | The system shall compute total revenue, total profit, profit margin, total orders, unique customers, average order value, total units sold and average discount. |
| **FR-3.2** | The system shall omit any figure whose source column is unmapped, rather than reporting zero. |
| **FR-3.3** | The system shall report revenue and profit change between the last two months present in the data. |
| **FR-3.4** | The system shall provide a revenue and profit time series grouped daily, weekly or monthly. |
| **FR-3.5** | The system shall provide totals broken down by category and by region, sorted descending. |

### 4.4 Product profitability

| ID | Requirement |
|---|---|
| **FR-4.1** | The system shall report, per product: revenue, profit, margin, units sold and share of revenue. |
| **FR-4.2** | The system shall flag products with negative profit. |
| **FR-4.3** | The system shall flag products with above-median revenue and margin below 5%. |
| **FR-4.4** | The system shall flag products with margin above 30%, and the five largest by revenue. |
| **FR-4.5** | The system shall present revenue against margin so that products earning nothing are visually separable from those earning well. |

### 4.5 Diagnosis

| ID | Requirement |
|---|---|
| **FR-5.1** | The system shall compare the last two months present in the data. |
| **FR-5.2** | The system shall decompose the change across each available dimension: category, region, customer and product. |
| **FR-5.3** | For each segment the system shall report its change and its share of the total change. |
| **FR-5.4** | Segments shall be ranked by absolute change, so that a small segment with a large percentage swing cannot dominate. |
| **FR-5.5** | The system shall state that contributions are arithmetic and not causal. |

### 4.6 Forecasting

| ID | Requirement |
|---|---|
| **FR-6.1** | The system shall forecast 1 to 24 periods ahead, grouped daily, weekly or monthly. |
| **FR-6.2** | The system shall require at least 6 periods of history and shall refuse with a clear message otherwise. |
| **FR-6.3** | The system shall evaluate at least two forecasting methods on held-back history. |
| **FR-6.4** | The system shall report MAE, RMSE and MAPE for each method. |
| **FR-6.5** | The system shall select the method with the lowest MAPE **among methods that were actually measured**. A method with no hold-out slice shall report no score and shall not be selected on accuracy. |
| **FR-6.6** | The system shall state which method was selected and its error. |
| **FR-6.7** | The system shall provide an interval around each forecast point, and shall not present it as a statistical confidence interval. |

### 4.7 Customer segmentation

| ID | Requirement |
|---|---|
| **FR-7.1** | The system shall compute recency, frequency and monetary value per customer. |
| **FR-7.2** | The system shall require at least 4 customers and shall refuse with a clear message otherwise. |
| **FR-7.3** | The system shall standardise the three measures before clustering. |
| **FR-7.4** | The system shall select the number of clusters automatically, within a user-supplied bound of 2 to 12. |
| **FR-7.5** | The system shall assign each cluster a plain-language name derived from its position relative to the population average. |
| **FR-7.6** | The system shall report the silhouette score so the user can judge how distinct the groups are. |
| **FR-7.7** | Where segments are plotted, no more than three shall be distinguished by colour. |

### 4.8 What-if simulation

| ID | Requirement |
|---|---|
| **FR-8.1** | The system shall accept adjustments to price, discount, demand and cost. |
| **FR-8.2** | The system shall model a discount change as a demand change using a stated elasticity of −1.5. |
| **FR-8.3** | The system shall return baseline and simulated figures side by side. |
| **FR-8.4** | The system shall classify the outcome as positive, cautious or negative, where cautious covers revenue rising while profit falls. |
| **FR-8.5** | The simulation shall not modify the stored data. |

### 4.9 Explainability

| ID | Requirement |
|---|---|
| **FR-9.1** | The system shall rank input columns by their influence on revenue. |
| **FR-9.2** | The system shall **not** use profit, or any column mapped to the target, as an input — a near-deterministic function of the target produces a tautology rather than an insight. |
| **FR-9.3** | The system shall require at least 10 rows and 2 usable input columns. |
| **FR-9.4** | The system shall state that the result explains the model, not real-world cause. |

### 4.10 Briefing and printable summary

| ID | Requirement |
|---|---|
| **FR-10.1** | The briefing shall be composed from fixed sentence templates filled with the user's own figures. It shall not generate prose. |
| **FR-10.2** | Each statement shall link to the page that evidences it. |
| **FR-10.3** | Where a figure is unavailable, the statement requiring it shall be omitted rather than estimated. |
| **FR-10.4** | The briefing shall state on the page how it was produced. |
| **FR-10.5** | The summary shall print to one A4 page with application navigation suppressed. |
| **FR-10.6** | The printed summary shall remain legible in greyscale. |

---

## 5. Non-functional requirements

### 5.1 Performance

| ID | Requirement |
|---|---|
| **NFR-1.1** | A dataset of 10,000 rows shall upload and parse in under 5 seconds. |
| **NFR-1.2** | Dashboard, product and diagnosis requests shall return in under 3 seconds for 10,000 rows. |
| **NFR-1.3** | Forecasting and segmentation shall return in under 15 seconds for 10,000 rows. |
| **NFR-1.4** | The interface shall remain responsive while a request is in flight and shall indicate that work is in progress. |

### 5.2 Reliability

| ID | Requirement |
|---|---|
| **NFR-2.1** | A malformed or unreadable file shall not leave a partial record. |
| **NFR-2.2** | An analysis that cannot be performed shall fail with a 400 and an explanation, never a 500. |
| **NFR-2.3** | Each analytical function shall be independently testable without starting the web server. |

### 5.3 Usability

| ID | Requirement |
|---|---|
| **NFR-3.1** | All interface text shall use plain language. Internal role names shall not appear in user-facing messages. |
| **NFR-3.2** | Every error shall state what went wrong and what to do about it. |
| **NFR-3.3** | Every empty state shall state what the page will show once data is available. |
| **NFR-3.4** | Monetary values shall be formatted consistently throughout. |

### 5.4 Maintainability

| ID | Requirement |
|---|---|
| **NFR-4.1** | Analytical logic shall reside in a service layer with no web-framework dependency. |
| **NFR-4.2** | API handlers shall contain no analytical logic. |
| **NFR-4.3** | Visual design values shall be defined once as tokens and referenced, never duplicated. |
| **NFR-4.4** | Number formatting shall have a single implementation. |

### 5.5 Security and privacy

| ID | Requirement |
|---|---|
| **NFR-5.1** | Uploaded data shall not be transmitted to any external service. |
| **NFR-5.2** | No model trained on user data shall be persisted. |
| **NFR-5.3** | Uploaded files shall be stored under generated names, not user-supplied ones. |
| **NFR-5.4** | Cross-origin requests shall be restricted to the development origins. |

> **Known gap.** The delivered system has no authentication. It is specified and
> built for single-user local operation. Deployment beyond that requires
> authentication and per-user data isolation, which are stated as future work.

### 5.6 Portability

| ID | Requirement |
|---|---|
| **NFR-6.1** | The server shall run on Windows, macOS and Linux without modification. |
| **NFR-6.2** | Database access shall go through an ORM so the engine can be changed without rewriting queries. |

---

## 6. Data requirements

### 6.1 Persistent data

**`datasets`** — one row per uploaded file.

| Column | Type | Notes |
|---|---|---|
| `id` | Integer | Primary key |
| `name` | String | Display name derived from the filename |
| `original_filename` | String | As supplied |
| `file_path` | String | Location of the stored file |
| `row_count`, `column_count` | Integer | |
| `columns_info` | JSON | Per-column type and null/distinct counts |
| `upload_date` | DateTime | |
| `file_size_bytes` | Integer | |

**`column_mappings`** — one row per mapped role.

| Column | Type | Notes |
|---|---|---|
| `id` | Integer | Primary key |
| `dataset_id` | Integer | Foreign key, cascade delete |
| `role` | String | One of the ten roles |
| `column_name` | String | The column it refers to |

**The database holds no transactional sales data.** Rows remain in the uploaded
file; every analysis re-reads it.

### 6.2 Input data expectations

The system imposes no schema. It requires only that at least one column can be
mapped to each role an analysis needs. Different analyses require different
roles; where one is missing the analysis is refused with an explanation rather
than approximated.

---

## 7. Constraints and assumptions

### 7.1 Constraints

| ID | Constraint |
|---|---|
| **C-1** | Single user. No authentication, no concurrent-user isolation. |
| **C-2** | Files up to 50 MB; all processing is in memory. |
| **C-3** | SQLite, which permits a single writer. |
| **C-4** | Frontend written in JavaScript, not TypeScript — a deliberate decision to reduce the learning curve during development. |
| **C-5** | Every request re-parses the source file; no caching layer. |

### 7.2 Assumptions

| ID | Assumption |
|---|---|
| **A-1** | One row represents one transaction line. Order-level figures are derived from rows, and no order identifier is used. |
| **A-2** | A discount column holds a fraction between 0 and 1. |
| **A-3** | Price elasticity of demand is −1.5. This is an assumption applied uniformly, not a value estimated from the user's data. |
| **A-4** | Dates are parseable by standard date inference. |
| **A-5** | Recency is measured against the latest date in the file, not the current date. |

### 7.3 Requirements verification

23 automated tests cover file ingestion and encoding handling, column mapping
persistence, error message quality, forecast scoring and selection, and
explainability input selection. Verification of the remaining requirements is
manual. The absence of automated frontend tests is recorded as a limitation.
