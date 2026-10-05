# BizOptAI - AI-Powered Business Intelligence & Profit Optimization Platform

An intelligent business analytics platform that transforms raw sales data into actionable insights through ML-powered forecasting, customer segmentation, product profitability analysis, diagnostic decomposition, what-if simulation, and SHAP-based model explainability.

## Features

### Data Management
- **CSV/Excel Upload** with drag-and-drop interface
- **Automatic Column Detection** - infers data types, suggests role mappings (date, revenue, profit, etc.)
- **Smart Column Mapping** - flexible mapping system so analytics work with any column naming convention

### Dashboard & KPIs
- 8 real-time KPI cards (revenue, profit, margin, orders, AOV, customers, growth rates)
- Interactive time series charts with revenue and profit trends
- Category and region breakdown visualizations
- Month-over-month growth tracking

### Forecasting
- **Dual-model approach**: XGBoost (with lag features) vs Exponential Smoothing
- Automatic model selection based on MAPE
- Confidence intervals (80% and 95%)
- Configurable forecast horizon and period type (daily, weekly, monthly)

### Customer Segmentation
- **RFM Analysis** (Recency, Frequency, Monetary) with automated scoring
- **K-Means Clustering** with silhouette-based auto-K selection
- Segment labeling: Champions, Loyal, At Risk, Lost, New, etc.
- Scatter plots and revenue distribution by segment

### Product Profitability (Phase 3)
- Per-product revenue, profit, margin, and units sold
- Automatic tagging: loss-making, high revenue/low margin, high margin, top sellers
- Revenue vs profit margin scatter visualization
- Revenue share analysis

### Business Diagnosis (Phase 3)
- Month-over-month metric change decomposition
- Multi-dimensional analysis across category, region, customer, and product
- Top-5 contributing factors to metric changes
- Visual breakdown charts per dimension

### What-If Simulator (Phase 3)
- Interactive parameter sliders: price, discount, demand, cost adjustments
- Demand elasticity modeling (-1.5 elasticity for discounts)
- Baseline vs simulated comparison with verdict (positive/cautious/negative)
- Actionable text recommendations

### SHAP Explainability (Phase 3)
- XGBoost model training on dataset features
- SHAP TreeExplainer for feature importance
- Summary and bar plot visualizations
- Per-feature importance ranking
- Profit is deliberately excluded as a feature when explaining revenue. Profit is
  revenue minus cost, so letting the model use it to explain revenue restates the
  target: it would be crowned the biggest driver every time and the answer would
  be a tautology rather than something a shop owner can act on.

### Assistant
- A written briefing composed from the dashboard, products and diagnosis figures
- **Templates, not generation** — no model writes prose here. Every sentence is a
  fixed template with your own numbers dropped into it, and each line links to the
  page that proves it.
- A sentence whose figure is missing from the file is left out rather than guessed at

### Summary
- One page gathering the headline figures and the biggest losses for a single file

## Tech Stack

### Backend
- **FastAPI** - async Python web framework
- **SQLAlchemy** + **SQLite** - ORM with lightweight database
- **Pandas** / **NumPy** - data processing
- **scikit-learn** - K-Means clustering, preprocessing
- **XGBoost** - gradient boosting for forecasting and explainability
- **SHAP** - model interpretability
- **Matplotlib** - server-side plot generation

### Frontend
- **React 19** (JavaScript) with Vite
- **Tailwind CSS 4** - utility-first styling
- **Recharts** - interactive charts (line, bar, scatter, pie)
- **Axios** - API client
- **React Router** - client-side routing
- **react-dropzone** - file upload
- **Lucide React** - icon library
- **Vitest** + **Testing Library** - component and unit tests in jsdom
- **oxlint** - linting

## Project Structure

```
BizOptAI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, startup
│   │   ├── config.py            # Settings and paths
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models/
│   │   │   └── dataset.py       # Dataset + ColumnMapping ORM models
│   │   ├── schemas/
│   │   │   └── dataset.py       # Pydantic request/response schemas
│   │   ├── api/
│   │   │   ├── router.py        # Central route aggregator
│   │   │   ├── upload.py        # Dataset CRUD + column mapping
│   │   │   ├── dashboard.py     # KPIs, time series, breakdowns
│   │   │   ├── forecast.py      # Forecasting endpoint
│   │   │   ├── customers.py     # Customer segmentation
│   │   │   ├── products.py      # Product profitability
│   │   │   ├── diagnosis.py     # Metric change diagnosis
│   │   │   └── simulator.py     # What-if + SHAP explanation
│   │   └── services/
│   │       ├── data_processor.py    # CSV parsing, stats, role suggestions
│   │       ├── kpi_calculator.py    # KPI computation engine
│   │       ├── forecaster.py        # XGBoost + ExpSmoothing forecasting
│   │       ├── segmentation.py      # RFM + K-Means segmentation
│   │       ├── profitability.py     # Product profitability analysis
│   │       ├── diagnosis.py         # MoM change decomposition
│   │       ├── simulator.py         # What-if simulation engine
│   │       └── explainer.py         # SHAP model explainability
│   ├── tests/                   # pytest suite for the service layer and API
│   │   ├── test_data_processor.py
│   │   ├── test_error_messages.py
│   │   ├── test_explain_features.py
│   │   ├── test_forecaster.py
│   │   └── test_upload_mapping.py
│   ├── data/sample/
│   │   └── Sample - Superstore.csv
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.js        # Axios API client
│   │   ├── App.jsx              # Router + lazily loaded routes
│   │   ├── lib/
│   │   │   ├── format.js        # How every number on every page is printed
│   │   │   ├── forecast.js      # Reading the forecaster's error figures
│   │   │   └── motion.js        # Count-up ticker, reveal and chart animation
│   │   ├── components/
│   │   │   ├── Layout/          # Sidebar, DashboardLayout
│   │   │   ├── Shared/          # DatasetSelector, Panel, Figure, PageHeader
│   │   │   ├── Upload/          # FileUpload, DatasetList, DataPreview, ColumnMapping
│   │   │   └── Dashboard/       # KPICards, SalesChart, CategoryBreakdown
│   │   ├── test/setup.js        # jsdom shims for the Vitest environment
│   │   └── pages/
│   │       ├── LandingPage.jsx
│   │       ├── UploadPage.jsx
│   │       ├── DashboardPage.jsx
│   │       ├── ForecastPage.jsx
│   │       ├── CustomersPage.jsx
│   │       ├── ProductsPage.jsx
│   │       ├── DiagnosisPage.jsx
│   │       ├── SimulatorPage.jsx
│   │       ├── AssistantPage.jsx
│   │       └── SummaryPage.jsx
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── ARCHITECTURE.md          # How the system is built and where it is weak
│   ├── PROJECT_REPORT.md        # Academic write-up
│   └── SRS.md                   # Software requirements specification
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

The app will be available at `http://localhost:5173`. The Vite dev server proxies `/api` requests to the FastAPI backend.

### Quick Start

1. Start the backend server (port 8000)
2. Start the frontend dev server (port 5173)
3. Open `http://localhost:5173` in your browser
4. Upload the sample dataset from `backend/data/sample/Sample - Superstore.csv`
5. Column meanings are detected and saved for you; open the file from the Upload data
   page to review or change them
6. Explore Dashboard, Forecasting, Customers, Products, Diagnosis, and Simulator pages

## Testing

### Backend (pytest, 23 tests)

```bash
cd backend
python -m pytest            # whole suite
python -m pytest -v         # with test names
```

Covers CSV parsing and role suggestion, column mapping, forecaster model
selection, the SHAP feature list, and the wording of the errors a user sees when
a column meaning is missing.

### Frontend (Vitest + Testing Library, 34 tests)

```bash
cd frontend
npm test                    # whole suite, once
npm run test:watch          # re-run on change
npm run lint                # oxlint
```

Covers the number formatters in `lib/format.js` — including what is printed when
a figure is absent — the forecaster's scored/unscored distinction, and the
Assistant's templated briefing, which is asserted to omit any sentence whose
figure the file does not have.

### A note on the lint config

`react/set-state-in-effect` is switched off for `src/pages/*.jsx` and
`src/lib/motion.js` in [.oxlintrc.json](frontend/.oxlintrc.json). Every instance
there is the ordinary data-fetching lifecycle — flip `loading` on, start the
request, flip it off in `finally`. Loading is genuinely temporal and cannot be
derived during render, so the rule has nothing to offer these files short of
adopting a data-fetching library. It stays on everywhere else.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Liveness check |
| POST | `/api/datasets/upload` | Upload CSV/Excel file |
| GET | `/api/datasets/` | List all datasets |
| GET | `/api/datasets/{id}` | Dataset detail with stats |
| DELETE | `/api/datasets/{id}` | Delete dataset |
| GET | `/api/datasets/{id}/suggestions` | Auto-detected column roles |
| POST | `/api/datasets/{id}/mappings` | Save column mappings |
| GET | `/api/datasets/{id}/mappings` | Get saved mappings |
| GET | `/api/dashboard/{id}/kpis` | Computed KPIs |
| GET | `/api/dashboard/{id}/timeseries` | Time series data |
| GET | `/api/dashboard/{id}/category-breakdown` | Category breakdown |
| GET | `/api/dashboard/{id}/region-breakdown` | Region breakdown |
| GET | `/api/dashboard/{id}/monthly-trend` | Monthly trend + growth |
| POST | `/api/forecast/{id}` | Run forecast |
| POST | `/api/customers/{id}/segment` | Run segmentation |
| GET | `/api/products/{id}/profitability` | Product profitability |
| GET | `/api/diagnosis/{id}` | Metric diagnosis |
| POST | `/api/simulator/{id}/what-if` | Run what-if simulation |
| GET | `/api/simulator/{id}/explain` | SHAP explanation |

## Sample Data

The included `Sample - Superstore.csv` holds 9,994 rows of US retail transactions —
5,009 orders placed by 793 customers between January 2014 and December 2017, covering
1,850 products. Columns:

- Row ID, Order ID, Order Date, Ship Date, Ship Mode
- Customer ID, Customer Name, Segment
- Country, City, State, Postal Code, Region
- Product ID, Category, Sub-Category, Product Name
- Sales, Quantity, Discount, Profit

The file is Windows-1252 encoded rather than UTF-8 and carries non-breaking spaces in
some product names, which is normal for a spreadsheet export. The reader detects the
encoding and normalises those characters, so a product does not split into two rows
when the data is grouped.

Four years of monthly history matters for forecasting: against this file the models
score around 27% MAPE, where a three-month extract scores nearer 185%.

## Architecture Decisions

- **Column Mapping System**: Users map CSV columns to business roles (date, revenue, profit, etc.) so analytics aren't hardcoded to specific column names. This makes the platform work with any dataset structure.
- **Service Layer Separation**: ML/analytics logic lives in `services/`, completely decoupled from HTTP handling in `api/`. Each service is independently testable.
- **Dual-Model Forecasting**: XGBoost with lag features vs Exponential Smoothing with auto-tuned alpha. Best model selected by MAPE, giving robust forecasts across different data patterns.
- **SQLite + SQLAlchemy**: SQLite eliminates setup friction for development; SQLAlchemy abstraction allows migration to PostgreSQL for production.
- **Templated Assistant, not a generated one**: The briefing is assembled from fixed sentences with your figures dropped in. A generated sentence is one nobody can check against the data, and the entire value of this tool rests on every claim being traceable to a page that proves it.
- **Route-level code splitting**: Six pages draw charts and so pull in Recharts, much the heaviest dependency here. Loading them on demand keeps the chart library out of the first download — the landing page ships 80 kB of JavaScript gzipped instead of 249 kB.

## Limitations

- **Diagnosis** performs contribution analysis (what changed most), not causal root cause analysis
- **Price elasticity** in the simulator uses a fixed elasticity coefficient, not econometrically estimated values
- **Forecasting** works best with 30+ data points; small datasets may produce wide confidence intervals
- **SHAP** explains XGBoost model behavior, not necessarily real-world causal relationships
- **Single-user mode** - no authentication or multi-tenancy (planned for production release)

## Roadmap

- [x] Assistant briefing — built as fixed templates over your own figures. No
      model writes prose, by design: a generated sentence is one nobody can check,
      and every claim on that page has to link to the page that proves it.
- [ ] Dark mode
- [ ] Data export (CSV, PNG charts)
- [ ] Inventory management module
- [ ] Dynamic pricing with price elasticity modeling
- [ ] Full optimization engine
- [ ] Authentication and multi-tenancy
- [ ] PostgreSQL migration
- [ ] Docker deployment
- [ ] CI/CD pipeline

## License

This project is part of an academic submission. All rights reserved.
