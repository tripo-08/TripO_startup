from fastapi.testclient import TestClient
from ..main import app

client = TestClient(app)

def test_analyze_post():
    response = client.post("/analyze_post", json={"text": "This is a test"})
    assert response.status_code == 200
    data = response.json()
    assert "fake_probability" in data
    assert "risk_score" in data
