from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create the tables before the first request is served.

    Everything before the yield runs at startup, everything after at shutdown.
    There is nothing to tear down — SQLite holds no pool worth closing — so the
    second half is empty.
    """
    init_db()
    yield


app = FastAPI(
    title="BizOptAI",
    description="AI-Powered Business Intelligence & Profit Optimization Platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "BizOptAI"}
