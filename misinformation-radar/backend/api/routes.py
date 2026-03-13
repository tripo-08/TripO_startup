from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services import (
    analyze_post,
    get_trending_claims,
    get_misinformation_alerts,
    get_propagation_graph,
)

router = APIRouter()


class AnalyzeRequest(BaseModel):
    text: str


class AnalyzeResponse(BaseModel):
    fake_probability: float
    risk_score: float


@router.post("/analyze_post", response_model=AnalyzeResponse)
async def analyze_post(request: AnalyzeRequest):
    result = analyze_post(request.text)
    if result is None:
        raise HTTPException(status_code=500, detail="Analysis failed")
    return result


@router.get("/trending_claims")
async def trending_claims():
    return get_trending_claims()


@router.get("/misinformation_alerts")
async def misinformation_alerts():
    return get_misinformation_alerts()


@router.get("/propagation_graph")
async def propagation_graph():
    return get_propagation_graph()
