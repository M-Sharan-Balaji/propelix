import asyncio
import json
import os
import statistics
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field


APP_ROOT = Path(__file__).resolve().parent
INDEX_FILE = APP_ROOT / "index.html"
TINYFISH_API_URL = "https://agent.tinyfish.ai/v1/automation/run"


def load_env_value(key: str, default: str = "") -> str:
    env_value = os.getenv(key)
    if env_value:
        return env_value

    for candidate in (APP_ROOT / ".env.local", APP_ROOT / ".env"):
        if not candidate.exists():
            continue
        for line in candidate.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith(f"{key}="):
                return line.split("=", 1)[1].strip()

    return default


TINYFISH_API_KEY = load_env_value("TINYFISH_API_KEY", "")
DEMO_99CO_USERNAME = "80330402"
DEMO_99CO_PASSWORD = "tinyfishisthebest"
JOBS: dict[str, dict[str, Any]] = {}

app = FastAPI(title="Propelix", version="1.0.0")


class PropertyDetails(BaseModel):
    town: str = Field(..., min_length=2)
    block: str = Field(..., min_length=1)
    street_name: str = Field(..., min_length=2)
    flat_type: str = Field(..., min_length=2)
    initial_asking_price: float | None = None
    photo_names: list[str] = Field(default_factory=list)


class AnalyzePriceRequest(PropertyDetails):
    pass


class Credentials(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class PublishListingRequest(BaseModel):
    credentials: Credentials
    property_details: PropertyDetails
    finalized_asking_price: float = Field(..., gt=0)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_job(job_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    job_id = str(uuid.uuid4())
    job = {
        "job_id": job_id,
        "job_type": job_type,
        "status": "queued",
        "created_at": utc_now(),
        "updated_at": utc_now(),
        "payload": payload,
        "logs": [],
        "result": None,
        "error": None,
    }
    JOBS[job_id] = job
    return job


def append_log(job_id: str, message: str) -> None:
    job = JOBS[job_id]
    job["logs"].append({"timestamp": utc_now(), "message": message})
    job["updated_at"] = utc_now()


def set_job_status(job_id: str, status: str) -> None:
    JOBS[job_id]["status"] = status
    JOBS[job_id]["updated_at"] = utc_now()


def complete_job(job_id: str, result: dict[str, Any]) -> None:
    job = JOBS[job_id]
    job["status"] = "completed"
    job["result"] = result
    job["updated_at"] = utc_now()


def fail_job(job_id: str, message: str) -> None:
    job = JOBS[job_id]
    job["status"] = "failed"
    job["error"] = message
    job["updated_at"] = utc_now()
    append_log(job_id, f"Job failed: {message}")


def ensure_tinyfish_key() -> str:
    if not TINYFISH_API_KEY:
        raise RuntimeError("TINYFISH_API_KEY is not configured in the environment.")
    return TINYFISH_API_KEY


def extract_json_payload(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        return json.loads(raw)
    raise ValueError("Tinyfish result payload was not valid JSON.")


def find_numeric_prices(payload: Any) -> list[float]:
    prices: list[float] = []

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                if isinstance(value, (int, float)) and any(
                    token in key.lower() for token in ("price", "amount", "resale")
                ):
                    prices.append(float(value))
                else:
                    walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(payload)
    return [price for price in prices if price > 0]


async def run_tinyfish(url: str, goal: str) -> dict[str, Any]:
    api_key = ensure_tinyfish_key()
    payload = {
        "url": url,
        "goal": goal,
        "browser_profile": "stealth",
        "proxy_config": {"enabled": False},
        "api_integration": "propelix-fastapi-demo",
    }
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=30.0)) as client:
        response = await client.post(TINYFISH_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()


def build_analysis_prompt(property_details: PropertyDetails) -> str:
    return f"""
You are an automated research assistant for Singapore HDB resale sellers.
Navigate to the HDB resale transaction portal and gather the 5 most recent comparable HDB resale transactions.

Target property:
- Town: {property_details.town}
- Block: {property_details.block}
- Street Name: {property_details.street_name}
- Flat Type: {property_details.flat_type}

Find the 5 most recent comparable transactions that best match this property.
Return ONLY valid JSON in this exact shape:
{{
  "comparables": [
    {{
      "transaction_month": "YYYY-MM",
      "block": "string",
      "street_name": "string",
      "flat_type": "string",
      "resale_price_sgd": 0
    }}
  ]
}}
""".strip()


def build_publish_prompt(
    credentials: Credentials,
    property_details: PropertyDetails,
    finalized_asking_price: float,
) -> str:
    return f"""
You are an automated real estate assistant. Navigate to 99.co and log in using the provided credentials.

99.co login details for this demo:
- Username: {DEMO_99CO_USERNAME}
- Password: {DEMO_99CO_PASSWORD}

Property details:
- Block: {property_details.block}
- Street: {property_details.street_name}
- Town: {property_details.town}
- Flat Type: {property_details.flat_type}
- Asking Price: SGD {finalized_asking_price:,.0f}
- Uploaded photo file names: {", ".join(property_details.photo_names) if property_details.photo_names else "No photo files were uploaded from the seller portal."}

Once logged in, navigate to the "Create Listing" or "Post Ad" section. Fill out the property form for an HDB Resale flat using the provided Block, Street, Flat Type, and Asking Price. If the uploaded property photos are accessible, use them during listing creation. If image upload is required and the local files are not accessible in the browser session, upload a placeholder image instead and mention that in the notes. Click submit or publish. Verify the listing is live and return ONLY valid JSON in this exact shape:
{{
  "listing_status": "draft_or_live",
  "public_url": "https://...",
  "notes": "short summary"
}}
""".strip()


async def analyze_price_job(job_id: str, payload: AnalyzePriceRequest) -> None:
    try:
        set_job_status(job_id, "running")
        append_log(job_id, "Starting Tinyfish analysis for recent comparables.")
        prompt = build_analysis_prompt(payload)
        tinyfish_response = await run_tinyfish(
            "https://services2.hdb.gov.sg/webapp/BB33RTIS/",
            prompt,
        )
        append_log(job_id, "Tinyfish scraping completed. Parsing comparable transactions.")

        raw_result = tinyfish_response.get("result") or tinyfish_response.get("data") or {}
        parsed_result = extract_json_payload(raw_result)
        comparables = parsed_result.get("comparables", [])
        prices = [item.get("resale_price_sgd") for item in comparables if item.get("resale_price_sgd")]

        if len(prices) < 1:
            prices = find_numeric_prices(parsed_result)

        if len(prices) < 1:
            raise ValueError("No comparable transaction prices were returned by Tinyfish.")

        last_five_prices = [float(price) for price in prices[:5]]
        average_price = statistics.mean(last_five_prices)
        suggested_price = round((average_price * 1.03) / 1000) * 1000

        append_log(job_id, f"Computed average comparable price from {len(last_five_prices)} transactions.")
        append_log(job_id, f"Suggested seller price calculated at SGD {suggested_price:,.0f}.")

        complete_job(
            job_id,
            {
                "comparables": comparables,
                "average_transacted_price": round(average_price, 2),
                "suggested_price": suggested_price,
                "pricing_method": "Average of last 5 comparables plus 3% negotiation buffer",
                "tinyfish_run": {
                    "status": tinyfish_response.get("status"),
                    "run_id": tinyfish_response.get("run_id"),
                    "streaming_url": tinyfish_response.get("streaming_url"),
                },
            },
        )
    except httpx.HTTPStatusError as exc:
        fail_job(job_id, f"Tinyfish API returned {exc.response.status_code}: {exc.response.text}")
    except Exception as exc:
        fail_job(job_id, str(exc))


async def publish_listing_job(job_id: str, payload: PublishListingRequest) -> None:
    try:
        set_job_status(job_id, "running")
        append_log(job_id, "Starting Tinyfish agent to publish 99.co listing.")
        prompt = build_publish_prompt(
            Credentials(username=DEMO_99CO_USERNAME, password=DEMO_99CO_PASSWORD),
            payload.property_details,
            payload.finalized_asking_price,
        )
        tinyfish_response = await run_tinyfish("https://www.99.co/singapore/sale", prompt)
        append_log(job_id, "Tinyfish listing automation completed. Parsing publication result.")

        raw_result = tinyfish_response.get("result") or tinyfish_response.get("data") or {}
        parsed_result = extract_json_payload(raw_result)

        complete_job(
            job_id,
            {
                "listing_status": parsed_result.get("listing_status", "unknown"),
                "public_url": parsed_result.get("public_url"),
                "notes": parsed_result.get("notes", "No notes returned."),
                "tinyfish_run": {
                    "status": tinyfish_response.get("status"),
                    "run_id": tinyfish_response.get("run_id"),
                    "streaming_url": tinyfish_response.get("streaming_url"),
                },
            },
        )
        append_log(job_id, "Listing publication job completed successfully.")
    except httpx.HTTPStatusError as exc:
        fail_job(job_id, f"Tinyfish API returned {exc.response.status_code}: {exc.response.text}")
    except Exception as exc:
        fail_job(job_id, str(exc))


@app.get("/")
async def serve_index() -> FileResponse:
    if not INDEX_FILE.exists():
        raise HTTPException(status_code=404, detail="index.html not found.")
    return FileResponse(INDEX_FILE)


@app.post("/api/analyze-price/start")
async def start_analyze_price(request: AnalyzePriceRequest) -> dict[str, str]:
    job = create_job("analyze_price", request.model_dump())
    append_log(job["job_id"], "Price analysis job queued.")
    asyncio.create_task(analyze_price_job(job["job_id"], request))
    return {"job_id": job["job_id"], "status": job["status"]}


@app.post("/api/publish-listing/start")
async def start_publish_listing(request: PublishListingRequest) -> dict[str, str]:
    job = create_job("publish_listing", request.model_dump())
    append_log(job["job_id"], "Listing publication job queued.")
    asyncio.create_task(publish_listing_job(job["job_id"], request))
    return {"job_id": job["job_id"], "status": job["status"]}


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str) -> dict[str, Any]:
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
