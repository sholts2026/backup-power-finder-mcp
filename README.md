# Backup Power Finder

Backup Power Finder is an MCP-based ChatGPT shopping app for comparing portable battery power stations and solar generator bundles. It ranks products by device load, target runtime, use case, solar charging, portability, battery chemistry, and budget.

The app provides modeled estimates and shopping guidance. It does not sell products, process payments, or recommend fuel-burning generators for indoor use.

## Local run

```powershell
$env:PUBLISHED_APP = "backup-power-finder"
$env:PUBLIC_BASE_URL = "http://localhost:8790"
npm start
```

Then send MCP requests to `http://localhost:8790/mcp`.

## Production

Deploy with `render.yaml`. The intended production endpoint is:

```text
https://backup-power-finder-mcp.onrender.com/mcp
```

Set `AFFILIATE_CONFIG_JSON` only after a merchant approves the publisher account. EcoFlow and BLUETTI applications were pending in Awin on September 10, 2026, so their affiliate templates remain disabled.

## Review endpoints

- `GET /health`
- `GET /privacy`
- `GET /terms`
- `GET /support`
- `GET /partners`
- `POST /mcp`
- `POST /apps/backup-power-finder/recommend`

Submission metadata and reviewer cases are in `submission/`.
