/**
 * api.js — AI assistant integration for the Forcepoint AI Enablement Portal
 * Owner: IT Enterprise AI team · ITEnterpriseAIteam@forcepoint.com
 * Jira:  AI-110
 *
 * ─── CONFIGURATION ──────────────────────────────────────────────────────────
 *
 * For LOCAL / DIRECT use (quick start):
 *   Set API_KEY below to your Anthropic API key.
 *   ⚠ WARNING: Never commit a real API key to source control.
 *   ⚠ WARNING: Never use direct API access in production — use the proxy path.
 *
 * For PRODUCTION use (recommended):
 *   1. Deploy the api/ folder as an Azure Function (see api/README.md).
 *   2. Set USE_PROXY = true and PROXY_URL to your function endpoint.
 *   3. Leave API_KEY as an empty string.
 *   The proxy validates the user's Entra ID token before calling Claude,
 *   keeping the API key out of the browser entirely.
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

window.API = (function () {

  /* ── CONFIG — edit these values ─────────────────────────── */
  const CONFIG = {
    // Direct mode (dev / local only)
    API_KEY:   "",                          // ← paste your Anthropic key here for local testing
    MODEL:     "claude-sonnet-4-20250514",
    MAX_TOKENS: 1000,

    // Proxy mode (production)
    USE_PROXY:  false,                      // ← set true when deploying to Azure
    PROXY_URL:  "/api/ask",                 // ← Azure Function URL (relative or absolute)

    // System prompt — the Sage persona
    SYSTEM: `You are the Forcepoint Enterprise AI assistant.

Your role is to help Forcepoint employees use AI tools effectively and safely.
You embody the Forcepoint brand voice: the Sage archetype — warm, direct, collaborative and radically simple.

Guidelines:
- Keep all responses to 2–3 sentences maximum unless the user explicitly asks for more detail.
- Use plain language. Avoid jargon unless it genuinely aids clarity.
- Never reproduce, describe or infer Protected Information, source code, customer PII or Forcepoint Confidential data.
- If you are uncertain, say so clearly rather than guessing.
- Always encourage users to check the Forcepoint AI Policy (FP-IS-AI) and the AI Registry for tool approvals.
- Reference the AI Ambassador program and the Enterprise AI team (ITEnterpriseAIteam@forcepoint.com) when relevant.`
  };

  /* ── PUBLIC API ──────────────────────────────────────────── */
  async function ask(userMessage) {
    if (!userMessage || !userMessage.trim()) {
      return { ok: false, text: "Please enter a question." };
    }

    try {
      if (CONFIG.USE_PROXY) {
        return await _callProxy(userMessage.trim());
      } else {
        return await _callDirect(userMessage.trim());
      }
    } catch (err) {
      console.error("[API] Error:", err);
      return { ok: false, text: "Connection issue — please try again or ask in the main Claude chat window." };
    }
  }

  /* ── DIRECT (dev only) ───────────────────────────────────── */
  async function _callDirect(message) {
    if (!CONFIG.API_KEY) {
      return {
        ok: false,
        text: "No API key configured. Add your Anthropic API key to js/api.js for local testing, or deploy the Azure Function proxy for production use. See api/README.md for instructions."
      };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            CONFIG.API_KEY,
        "anthropic-version":    "2023-06-01"
      },
      body: JSON.stringify({
        model:      CONFIG.MODEL,
        max_tokens: CONFIG.MAX_TOKENS,
        system:     CONFIG.SYSTEM,
        messages:   [{ role: "user", content: message }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { ok: false, text: `API error ${response.status}: ${err?.error?.message || "unknown error"}` };
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    return { ok: true, text: text || "No response returned." };
  }

  /* ── PROXY (production) ──────────────────────────────────── */
  async function _callProxy(message) {
    const response = await fetch(CONFIG.PROXY_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      // Entra ID token is sent automatically as a cookie in Azure Static Web Apps
      // with EasyAuth enabled. If using a custom proxy, add an Authorization header here.
      body:    JSON.stringify({ message })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { ok: false, text: `Proxy error ${response.status}: ${err?.error || "unknown error"}` };
    }

    const data = await response.json();
    return { ok: true, text: data.text || "No response returned." };
  }

  return { ask };

})();
