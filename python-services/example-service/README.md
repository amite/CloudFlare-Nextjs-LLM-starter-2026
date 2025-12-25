# Example Python Microservice

A FastAPI-based microservice template for the CF Next LLM Boilerplate.

## Features

- FastAPI with automatic OpenAPI documentation
- Service-to-service authentication via shared secret
- Health check endpoint
- Docker support with multi-stage build using `uv`
- Structured logging

## Local Development

### Using uv (recommended)

```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"

# Run the service
uvicorn src.main:app --reload --port 8000
```

### Using Docker

```bash
# From the project root
docker compose --profile python up

# Or build and run directly
cd python-services/example-service
docker build -t example-service .
docker run -p 8000:8000 -e SERVICE_SECRET=your-secret example-service
```

## API Endpoints

### Health Check
```
GET /health
```

Returns service health status.

### Process Data
```
POST /process
Header: x-service-secret: <your-secret>
Body: {
  "data": "string to process",
  "options": {}  // optional
}
```

Example:
```bash
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -H "x-service-secret: dev-secret" \
  -d '{"data": "hello world"}'
```

### API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_SECRET` | Shared secret for authentication | `dev-secret` |
| `LOG_LEVEL` | Logging level | `INFO` |

## Integration with Next.js

Call this service from your Next.js API routes:

```typescript
// app/api/python/example/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(`${process.env.PYTHON_SERVICE_URL}/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-service-secret": process.env.PYTHON_SERVICE_SECRET!,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return NextResponse.json(data);
}
```

## Deployment

For production deployment, consider:

1. **Cloudflare Workers** - Use Cloudflare's Python support (limited)
2. **Cloud Run** - Google Cloud's serverless container platform
3. **Fly.io** - Edge deployment with global distribution
4. **Railway** - Simple container deployment
5. **Render** - Easy Docker deployment

Each platform has its own deployment process, but the Docker image should work with any container hosting service.
