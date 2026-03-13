# Misinformation Radar

Backend and frontend for real-time misinformation detection system.

## Backend

### Setup
```
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload
```

### API Endpoints
- `POST /analyze_post` - analyze content for fake news and risk.
- `GET /trending_claims` - list trending claims.
- `GET /misinformation_alerts` - current alerts.
- `GET /propagation_graph` - network data.

## Frontend

(Not yet implemented)

## Development

Modules are organized under `backend/api`, `backend/pipeline`, `backend/services`, and `backend/utils`.
