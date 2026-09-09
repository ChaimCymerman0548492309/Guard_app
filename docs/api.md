# Guardian API

Base URL: `http://localhost:3000`

## Response Format

All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "App not found"
  },
  "meta": { ... }
}
```

## Endpoints

### Health

`GET /health`

Returns API status.

### Apps

`GET /api/v1/apps`

List all monitored apps with risk levels.

`GET /api/v1/apps/:id`

Get app details including latest risk assessment.

### Dashboard

`GET /api/v1/dashboard/summary`

Returns risk counts, total apps, and recent alerts.

### OpenAPI

`GET /api/v1/openapi`

Returns OpenAPI 3.0 stub specification.

## Authentication

Not required in Phase 1. JWT auth planned for cloud sync.

## Rate Limiting

100 requests per 15 minutes per IP (configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`).
