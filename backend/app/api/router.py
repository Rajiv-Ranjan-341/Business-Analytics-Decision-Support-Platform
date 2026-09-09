from fastapi import APIRouter

from app.api.upload import router as upload_router
from app.api.dashboard import router as dashboard_router
from app.api.forecast import router as forecast_router
from app.api.customers import router as customers_router
from app.api.products import router as products_router
from app.api.diagnosis import router as diagnosis_router
from app.api.simulator import router as simulator_router

api_router = APIRouter()
api_router.include_router(upload_router)
api_router.include_router(dashboard_router)
api_router.include_router(forecast_router)
api_router.include_router(customers_router)
api_router.include_router(products_router)
api_router.include_router(diagnosis_router)
api_router.include_router(simulator_router)
