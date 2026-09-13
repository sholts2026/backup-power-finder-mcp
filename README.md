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

Set `AFFILIATE_CONFIG_JSON` with the approved BLUETTI Awin configuration after testing redirects. BLUETTI US is joined for publisher `3068771` (advertiser `59271`); EcoFlow remains rejected and disabled.

## Review endpoints

- `GET /health`
- `GET /privacy`
- `GET /terms`
- `GET /support`
- `GET /partners`
- `POST /mcp`
- `POST /apps/backup-power-finder/recommend`

Submission metadata and reviewer cases are in `submission/`.
