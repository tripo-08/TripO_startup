from fastapi import FastAPI
from .api import routes

app = FastAPI(
    title="Misinformation Radar API",
    version="0.1.0",
    description="Backend service for monitoring misinformation in real time",
)

app.include_router(routes.router)
