import os
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", "4001"))
PROPERTY_SERVICE_URL = os.getenv("PROPERTY_SERVICE_URL", "http://localhost:3002")
RESIDENTS_SERVICE_URL = os.getenv("RESIDENTS_SERVICE_URL", "http://localhost:3003")
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://localhost:3004")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Mobile Gateway",
    description="Prehod API za mobilnega odjemalca",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["Health"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "mobile-gateway"}


async def forward_json(method: str, url: str, json_body: dict[str, Any] | None = None):
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.request(method, url, json=json_body)

    if response.headers.get("content-type", "").startswith("application/json"):
        payload = response.json()
    else:
        payload = {"detail": response.text}

    return response.status_code, payload


@app.get("/properties/{property_id}", tags=["Mobile"])
async def get_property(property_id: int):
    status_code, payload = await forward_json(
        "GET", f"{PROPERTY_SERVICE_URL}/properties/by-id/{property_id}"
    )
    if status_code >= 400:
        raise HTTPException(status_code=status_code, detail=payload)
    return payload


@app.get("/tenants/{tenant_id}/property", tags=["Mobile"])
async def get_tenant_property(tenant_id: int):
    async with httpx.AsyncClient(timeout=20.0) as client:
        resident_response = await client.get(f"{RESIDENTS_SERVICE_URL}/residents/{tenant_id}")

        if resident_response.status_code >= 400:
            raise HTTPException(
                status_code=resident_response.status_code,
                detail=resident_response.json(),
            )

        resident_payload = resident_response.json()
        resident_data = resident_payload.get("data", {})
        property_id = resident_data.get("property_id")
        if not property_id:
            raise HTTPException(status_code=404, detail="Resident has no property assigned")

        property_response = await client.get(
            f"{PROPERTY_SERVICE_URL}/properties/by-id/{property_id}"
        )

        if property_response.status_code >= 400:
            raise HTTPException(
                status_code=property_response.status_code,
                detail=property_response.json(),
            )

        return {
            "tenant": resident_data,
            "property": property_response.json(),
        }


@app.get("/tenants/{tenant_id}/payments", tags=["Mobile"])
async def get_tenant_payments(tenant_id: int):
    async with httpx.AsyncClient(timeout=20.0) as client:
        resident_response = await client.get(f"{RESIDENTS_SERVICE_URL}/residents/{tenant_id}")
        if resident_response.status_code >= 400:
            raise HTTPException(
                status_code=resident_response.status_code,
                detail=resident_response.json(),
            )

        resident_payload = resident_response.json()
        resident_data = resident_payload.get("data", {})
        property_id = resident_data.get("property_id")
        if not property_id:
            raise HTTPException(status_code=404, detail="Resident has no property assigned")

        payments_response = await client.get(
            f"{PAYMENT_SERVICE_URL}/payments/residents/{tenant_id}"
        )

        if payments_response.status_code >= 400:
            raise HTTPException(
                status_code=payments_response.status_code,
                detail=payments_response.json(),
            )

        return {
            "tenant": resident_data,
            "payments": payments_response.json(),
        }


@app.get("/tenants/{tenant_id}/dashboard", tags=["Mobile"])
async def get_tenant_dashboard(tenant_id: int):
    async with httpx.AsyncClient(timeout=20.0) as client:
        resident_response = await client.get(f"{RESIDENTS_SERVICE_URL}/residents/{tenant_id}")
        if resident_response.status_code >= 400:
            raise HTTPException(
                status_code=resident_response.status_code,
                detail=resident_response.json(),
            )

        resident_payload = resident_response.json()
        resident_data = resident_payload.get("data", {})
        property_id = resident_data.get("property_id")

        property_payload = None
        if property_id:
            property_response = await client.get(
                f"{PROPERTY_SERVICE_URL}/properties/by-id/{property_id}"
            )
            if property_response.status_code < 400:
                property_payload = property_response.json()

        payments_response = await client.get(
            f"{PAYMENT_SERVICE_URL}/payments/residents/{tenant_id}"
        )
        payments_payload = payments_response.json() if payments_response.status_code < 400 else []

        return {
            "tenant": resident_data,
            "property": property_payload,
            "payments": payments_payload,
        }
