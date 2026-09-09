# Security

## API Security

- **Helmet** — HTTP security headers
- **CORS** — Configurable origin restriction
- **Rate limiting** — 100 requests per 15 minutes (configurable)
- **Request ID** — Every request gets a unique `x-request-id` header
- **Zod validation** — Input validation on all endpoints
- **Structured logging** — Pino with no sensitive data in logs

## Mobile Security

- SQLite database stored in app sandbox
- No root/jailbreak detection in Phase 1
- Simulator mode clearly labeled in UI

## Secrets Management

- `.env` files are gitignored
- `JWT_SECRET` must be changed in production
- Database credentials via environment variables only

## Known Limitations

- No certificate pinning in Phase 1
- No end-to-end encryption for optional cloud sync
- Android VPN is a metadata-only POC with documented limitations — see [ADR-002](decisions/ADR-002-android-vpn.md)
