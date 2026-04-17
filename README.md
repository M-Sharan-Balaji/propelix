# Propelix

Propelix is a FastAPI + vanilla JavaScript MVP for HDB resale sellers. It helps an owner:

- enter their property details once
- analyze comparable listings on `99.co`
- review a suggested asking price
- confirm the exact posting price
- publish to `99.co` through a TinyFish automation agent

The UI also includes a live TinyFish browser preview so judges can watch the agent work during both the analysis and publish flows.

## Stack

- FastAPI
- Vanilla JavaScript SPA
- Tailwind CSS via CDN
- TinyFish automation API

## Local setup

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

2. Add your TinyFish API key:

```bash
TINYFISH_API_KEY=your_tinyfish_api_key
```

3. Start the app:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000
```

4. Open `http://127.0.0.1:8000`

## Render deployment

This repo now includes a Render blueprint at [`render.yaml`](./render.yaml).

Manual Render settings if you create the service in the UI:

- Runtime: `Python`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Plan: `Free`

Required environment variable:

- `TINYFISH_API_KEY`

## API routes

- `GET /`
- `GET /health`
- `POST /api/analyze-price/start`
- `POST /api/publish-listing/start`
- `GET /api/jobs/{job_id}`
- `POST /api/tinyfish/stream`

## Important MVP notes

- Jobs are stored in memory, so they reset when the service restarts.
- Free Render services spin down on idle, so the first request after inactivity can be slow.
- The current flow is `99.co` only.
