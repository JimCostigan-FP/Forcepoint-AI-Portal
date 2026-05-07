# Forcepoint AI Enablement Portal

**Owner:** IT Enterprise AI team — ITEnterpriseAIteam@forcepoint.com  
**Program manager:** Jim Costigan, AI Program Manager  
**Jira:** [AI-110 — Build Dedicated AI Enablement Portal for Forcepoint](https://forcepoint.atlassian.net/browse/AI-110)  
**Confluence:** [AI Enablement Portal](https://forcepoint.atlassian.net/wiki/spaces/AI/pages/5009637449)  
**Architecture doc:** [Deployment Architecture](https://forcepoint.atlassian.net/wiki/spaces/AI/pages/5011832833)

---

## What this is

A Claude API-powered internal web portal that replaces SharePoint as Forcepoint's central hub for all things AI. Single-file HTML/CSS/JS frontend, with an optional Azure Function proxy for production API calls.

Seven sections: How-tos & tips · Latest news · Skills library · Prompt showcase · Events · AI Ambassador program · Architecture & IT guidance.

---

## File structure

```
ai-portal/
├── index.html                  ← Main HTML (single page)
├── staticwebapp.config.json    ← Azure Static Web Apps config (auth, routing)
├── css/
│   └── portal.css              ← All styles (Forcepoint brand colours)
├── js/
│   ├── data.js                 ← All portal content (edit this to update text)
│   ├── api.js                  ← Claude API integration (direct or proxy)
│   └── portal.js               ← UI logic and rendering
└── api/
    └── ask/
        └── index.js            ← Azure Function proxy (production use)
```

---

## Quick start — local testing (no server needed)

1. Open `index.html` in any browser — it works from `file://`.
2. Open `js/api.js` and add your Anthropic API key:
   ```javascript
   API_KEY: "sk-ant-...",   // your key here
   ```
3. The Ask assistant will now respond to questions using Claude.

> ⚠ **Never commit a real API key to source control.** Use the proxy path for anything shared.

---

## Production deployment on Azure Static Web Apps

### Prerequisites
- Azure subscription with permissions to create Static Web Apps
- Entra ID app registration (see step 3)
- Anthropic API key stored in Azure Key Vault

### Step 1 — Create the Static Web App

```bash
az staticwebapp create \
  --name "fp-ai-portal" \
  --resource-group "rg-enterprise-ai" \
  --location "eastus2" \
  --sku "Standard"
```

### Step 2 — Deploy the files

Option A — GitHub Actions (recommended):
```bash
git init
git add .
git commit -m "Initial portal deploy"
# Link your repo to the Static Web App in the Azure portal
# GitHub Actions workflow is auto-generated
```

Option B — Azure CLI direct upload:
```bash
az staticwebapp upload \
  --name "fp-ai-portal" \
  --resource-group "rg-enterprise-ai" \
  --source "."
```

### Step 3 — Configure Entra ID SSO

1. In the Azure portal, go to **Entra ID → App registrations → New registration**.
2. Name: `Forcepoint AI Enablement Portal`
3. Redirect URI: `https://<your-app>.azurestaticapps.net/.auth/login/aad/callback`
4. Note the **Application (client) ID** and create a **client secret**.
5. In `staticwebapp.config.json`, replace `YOUR_TENANT_ID` with your Entra tenant ID.
6. In the Static Web App configuration, set:
   - `AZURE_CLIENT_ID` = the app registration client ID
   - `AZURE_CLIENT_SECRET` = the client secret (store in Key Vault, reference as a Key Vault secret)

### Step 4 — Configure the API proxy

1. In the Static Web App configuration, set:
   - `ANTHROPIC_API_KEY` = Key Vault reference (e.g. `@Microsoft.KeyVault(SecretUri=...)`)
   - `ANTHROPIC_MODEL` = `claude-sonnet-4-20250514`
   - `ALLOWED_ORIGINS` = `https://ai-enablement.forcepoint.com`

2. In `js/api.js`, set:
   ```javascript
   USE_PROXY: true,
   PROXY_URL: "/api/ask",
   API_KEY:   "",           // leave empty — key lives server-side
   ```

### Step 5 — Configure Forcepoint ONE ZTNA

Per the deployment architecture (Confluence AI-110-ARCH):
1. Create a ZTNA private application pointing to your Static Web App URL.
2. Deploy a ZTNA connector in the Azure vNet.
3. Set the internal DNS entry `ai-enablement.forcepoint.com` → Static Web App.
4. Set SWG egress policy to block direct consumer AI services; allow only the portal's LiteLLM gateway egress.

---

## Updating content

All portal content lives in `js/data.js`. Edit the arrays there to:
- Add/remove how-to articles
- Post news items
- Add skills to the library
- Update the events calendar
- Edit ambassador program info
- Update architecture guidance

No rebuild is required — just update `data.js` and redeploy.

---

## Adding DLP inspection

The Azure Function proxy (`api/ask/index.js`) has two clearly marked TODO comments for DLP integration:

- **P1** — before forwarding the user's prompt to Claude
- **P3** — before returning Claude's completion to the browser

Add your Forcepoint DLP API calls at those points. Contact the IT Security / DLP team for the API endpoint and authentication details.

---

## Browser support

Chrome 90+, Edge 90+, Firefox 90+, Safari 14+. No build step required — vanilla HTML/CSS/JS.

---

## Questions

Contact: ITEnterpriseAIteam@forcepoint.com  
Program manager: Jim Costigan (jim.costigan@forcepoint.com)  
Jira: AI-110
