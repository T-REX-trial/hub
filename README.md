# T-REX Trial Hub

Password-protected working page for the T-REX trial team.

The page is rebuilt every hour by GitHub Actions (`.github/workflows/deploy.yml`):
`build.py` decrypts `content.enc`, reads follow-up dates from Airtable and publishes an
encrypted page to GitHub Pages. No readable content or participant data is stored in this repository.

Required secrets (Settings → Secrets and variables → Actions):
- `SITE_PASSWORD` – the page password (must match the password `content.enc` was encrypted with)
- `AIRTABLE_TOKEN` – Airtable personal access token, scope `data.records:read`, access to the T-REX randomisation base only

To change the content, replace `content.enc` with a new version.
