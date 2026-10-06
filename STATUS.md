# Backup Power Finder Status

Checked: September 26, 2026

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
- Eleven automated tests pass.

## External status

- Public landing page: https://backup-power-finder.pages.dev
- GitHub repository: https://github.com/sholts2026/backup-power-finder-mcp
- Production service: https://backup-power-finder-mcp.onrender.com
- Production MCP endpoint: https://backup-power-finder-mcp.onrender.com/mcp
- Render Blueprint ID: `exs-dah6u9e1egvs73cs22gg`
- Render service ID: `srv-dah6uj1t0dsc73er4urg`
- Production smoke test passed on September 10, 2026: health, privacy, terms, tool listing, and recommendation call.
- EcoFlow Awin: verified as Joined in the Awin dashboard on September 23, 2026 with advertiser `59181` and publisher `3068771`; dashboard shows 2,289 products over 3 feeds.
- BLUETTI US Awin: verified as Joined in the Awin dashboard on September 23, 2026 with advertiser `59271` and publisher `3068771`; dashboard shows 879 products over 2 feeds.
- Affiliate tracking is enabled for `ecoflow`, `bluetti`, and imported `bluetti-us` feed rows.
- Gmail search in the connected mailbox did not find Awin approval/rejection messages after September 10, so the EcoFlow approval source should be verified in the Awin dashboard or the mailbox that received it before treating this as final accounting evidence.
- Gmail re-check on September 23, 2026 found no new Awin, Impact, Rakuten, OpenAI, ChatGPT app-review, EcoFlow, or BLUETTI approval/rejection messages in the connected mailbox.
- Automated tests passed on September 23, 2026: 11/11 in this package and 34/34 in the root workspace.
- Awin Payment Details was accessible after two-step verification on September 23, 2026. After the owner completed Tax Details and the bank/payment flow, Awin/Payoneer returned approval. The dashboard shows USD payouts configured through Payoneer international wire, monthly frequency, and USD 20 payment threshold. One Awin view may still show Payoneer verification wording while the provider registration settles.
- OpenAI approval received for `Backup Power Finder (v1.0.0)` on September 25, 2026. Published on September 26, 2026. Directory link: https://chatgpt.com/plugins/plugin_asdk_app_6aa27067948c8191b7a1aa83e78eb5db

## Next actions

1. Run a live ChatGPT smoke test for common prompts and outbound attribution.
2. Re-check Awin Payment Details after Payoneer verification settles to confirm no pending verification banner remains.
3. Confirm Render has `PUBLISHED_APP=backup-power-finder`, `REQUIRE_AFFILIATE_PRODUCTS=true`, and production `AFFILIATE_CONFIG_JSON` matching `config/affiliate.json`.
