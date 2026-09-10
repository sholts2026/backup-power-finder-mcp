# Backup Power Finder Status

Checked: September 10, 2026

## Ready

- Dedicated deployable MCP package.
- One public tool: `recommend_backup_power`.
- Structured recommendation output with 3-5 ranked products.
- Hard budget filtering.
- Modeled runtime and device-load explanation.
- Indoor fuel-generator and medical-device safety guardrails.
- Affiliate disclosure in each result and the overall presentation.
- Privacy, terms, support, partner, health, challenge, and MCP endpoints.
- Awin-compatible CSV/JSON feed importer.
- OpenAI submission metadata, logo, five positive cases, and three negative cases.
- Plugin manifest validation passes.
- Nine automated tests pass.

## External status

- Public landing page: https://backup-power-finder.pages.dev
- EcoFlow Awin application: pending approval.
- BLUETTI Awin application: pending approval.
- Affiliate tracking remains disabled until an approval is received.

## Next actions

1. Create the `backup-power-finder-mcp` GitHub repository and push this directory.
2. Create the Render service from `render.yaml`.
3. Verify the production MCP, privacy, terms, support, and challenge URLs.
4. Connect the production MCP endpoint in OpenAI Platform and run the eight reviewer cases.
5. Submit after identity verification and Apps Management permissions are confirmed.
