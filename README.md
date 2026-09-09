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
│   ├── data/sample/
│   │   └── sample_superstore.csv
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.js        # Axios API client
│   │   ├── App.jsx              # Router + routes
│   │   ├── components/
│   │   │   ├── Layout/          # Sidebar, DashboardLayout
│   │   │   ├── Shared/          # DatasetSelector, LoadingSpinner, PageHeader
│   │   │   ├── Upload/          # FileUpload, DatasetList, DataPreview, ColumnMapping
│   │   │   └── Dashboard/       # KPICards, SalesChart, CategoryBreakdown
│   │   └── pages/
│   │       ├── UploadPage.jsx
│   │       ├── DashboardPage.jsx
│   │       ├── ForecastPage.jsx
│   │       ├── CustomersPage.jsx
│   │       ├── ProductsPage.jsx
│   │       ├── DiagnosisPage.jsx
│   │       ├── SimulatorPage.jsx
│   │       └── AssistantPage.jsx
│   ├── package.json
│   └── vite.config.js
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
4. Upload the sample dataset from `backend/data/sample/sample_superstore.csv`
5. Map columns when prompted (auto-suggestions provided)
6. Explore Dashboard, Forecasting, Customers, Products, Diagnosis, and Simulator pages

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
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

The included `sample_superstore.csv` contains 30 rows of retail transaction data with columns:
- Order ID, Order Date, Ship Date
- Customer ID, Customer Name, Segment
- Country, City, State, Region
- Category, Sub-Category, Product Name
- Sales, Quantity, Discount, Profit

## Architecture Decisions

- **Column Mapping System**: Users map CSV columns to business roles (date, revenue, profit, etc.) so analytics aren't hardcoded to specific column names. This makes the platform work with any dataset structure.
- **Service Layer Separation**: ML/analytics logic lives in `services/`, completely decoupled from HTTP handling in `api/`. Each service is independently testable.
- **Dual-Model Forecasting**: XGBoost with lag features vs Exponential Smoothing with auto-tuned alpha. Best model selected by MAPE, giving robust forecasts across different data patterns.
- **SQLite + SQLAlchemy**: SQLite eliminates setup friction for development; SQLAlchemy abstraction allows migration to PostgreSQL for production.

## Limitations

- **Diagnosis** performs contribution analysis (what changed most), not causal root cause analysis
- **Price elasticity** in the simulator uses a fixed elasticity coefficient, not econometrically estimated values
- **Forecasting** works best with 30+ data points; small datasets may produce wide confidence intervals
- **SHAP** explains XGBoost model behavior, not necessarily real-world causal relationships
- **Single-user mode** - no authentication or multi-tenancy (planned for production release)

## Roadmap

- [ ] AI Assistant with LLM-powered template insights
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
