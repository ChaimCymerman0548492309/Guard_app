# Privacy Policy (Technical Summary)

## What Guardian Collects

Guardian is designed with privacy as a core principle:

- **On-device only (default):** All risk analysis runs locally.
- **Metadata only:** Domain names, byte counts, timestamps — never packet contents.
- **No account required** for core functionality.

## What Guardian Does NOT Collect

- Packet payloads or HTTP body content
- Passwords, messages, or personal file contents
- Location data (unless explicitly enabled in future versions)
- Contacts or photo contents (only access counts/metadata)

## Data Retention

See `config/retention.ts` for default retention periods:

| Data Type | Retention |
|-----------|-----------|
| Events | 30 days |
| Risk assessments | 90 days |
| Alerts | 60 days |
| Network events | 14 days |

## Optional Cloud Sync

When the API is enabled, encrypted sync may store aggregated risk data. This is opt-in and not required for Phase 1.

## User Rights

Users can delete all local data by clearing the app storage. No server-side data exists unless cloud sync is enabled.
