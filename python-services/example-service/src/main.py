"""
Example Python microservice using FastAPI.

This service demonstrates how to create a Python microservice
that can be called from the Next.js application.
"""

import os
import logging
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Example Python Service",
    description="Example microservice for CF Next LLM Boilerplate",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service secret for authentication
SERVICE_SECRET = os.getenv("SERVICE_SECRET", "dev-secret")


# Request/Response models
class ProcessRequest(BaseModel):
    """Request model for the process endpoint."""

    data: str
    options: dict[str, Any] | None = None


class ProcessResponse(BaseModel):
    """Response model for the process endpoint."""

    result: str
    processed_at: str
    metadata: dict[str, Any] | None = None


class HealthResponse(BaseModel):
    """Response model for health check."""

    status: str
    timestamp: str
    version: str


# Authentication dependency
def verify_service_secret(x_service_secret: str = Header(None)) -> bool:
    """Verify the service secret from the request header."""
    if x_service_secret != SERVICE_SECRET:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing service secret",
        )
    return True


# Routes
@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version="0.1.0",
    )


@app.post("/process", response_model=ProcessResponse)
async def process_data(
    request: ProcessRequest,
    _: bool = Header(default=None, alias="x-service-secret"),
) -> ProcessResponse:
    """
    Process data endpoint.

    This is an example endpoint that demonstrates how to:
    - Accept JSON input with validation
    - Perform some processing
    - Return a structured response

    In a real application, this could:
    - Run ML models
    - Process documents
    - Perform data transformations
    - Call external APIs
    """
    # Verify authentication (in production, use proper auth middleware)
    if _ is None:
        verify_service_secret(None)

    logger.info(f"Processing request with data length: {len(request.data)}")

    # Example processing - in a real service, this would do actual work
    processed_data = request.data.upper()  # Simple transformation

    # Add any metadata from options
    metadata = {
        "original_length": len(request.data),
        "processed_length": len(processed_data),
        **(request.options or {}),
    }

    return ProcessResponse(
        result=processed_data,
        processed_at=datetime.utcnow().isoformat(),
        metadata=metadata,
    )


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint with service info."""
    return {
        "service": "example-python-service",
        "version": "0.1.0",
        "docs": "/docs",
    }


# Run with uvicorn
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
