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

### Events

`GET /api/v1/events`

List network events. Query params: `limit` (default 50, max 200), `appId` (optional filter).

`GET /api/v1/apps/:id/events`

Network events for a specific app. Returns 404 if app not found.

`POST /api/v1/events/batch`

Optional sync endpoint for batched network metadata from mobile devices.

```json
{
  "deviceId": "uuid",
  "networkEvents": [
    {
      "appPackageName": "com.example.app",
      "domain": "example.com",
      "bytesSent": 1024,
      "bytesReceived": 512,
      "isNewDomain": true,
      "timestamp": "2026-01-01T12:00:00.000Z"
    }
  ]
}
```

Returns `{ "accepted": number }`. Uses PostgreSQL when available; accepts all events in simulator mode.

### Risk

`GET /api/v1/apps/:id/risk`

Returns the latest risk assessment for an app. Returns 404 if not found.

### Alerts

`GET /api/v1/alerts`

List alerts. Query param: `acknowledged` (`true` / `false`).

`GET /api/v1/alerts/:id`

Get a single alert.

`POST /api/v1/alerts/:id/block`

Block the domain associated with the alert and mark acknowledged.

`POST /api/v1/alerts/:id/allow`

Allow the connection and acknowledge the alert.

### Devices

`GET /api/v1/devices` — list connected / virtual devices

`GET /api/v1/devices/:id` — device details

`GET /api/v1/devices/:id/summary` — dashboard summary for one device

`GET /api/v1/devices/:id/apps` — apps on device with risk

`GET /api/v1/devices/:id/alerts` — alerts for device

`POST /api/v1/devices/:id/demo` — run Photo Cleaner demo (lab mode)

`POST /api/v1/devices/register` — register device for sync/lab

### OpenAPI

`GET /api/v1/openapi`

Returns full OpenAPI 3.0 specification for all endpoints.

## Authentication

Not required in Phase 1. JWT auth planned for cloud sync.

## Rate Limiting

100 requests per 15 minutes per IP (configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`).
