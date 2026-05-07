const CONFIG = {
  API_KEY:    "",
  MODEL:      "claude-sonnet-4-20250514",
  MAX_TOKENS: 1000,
  USE_PROXY:  false,
  PROXY_URL:  "/api/ask",
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
}

export async function ask(userMessage) {
  if (!userMessage || !userMessage.trim()) {
    return { ok: false, text: "Please enter a question." }
  }
  try {
    if (CONFIG.USE_PROXY) {
      return await callProxy(userMessage.trim())
    } else {
      return await callDirect(userMessage.trim())
    }
  } catch (err) {
    console.error("[API] Error:", err)
    return { ok: false, text: "Connection issue — please try again or ask in the main Claude chat window." }
  }
}

async function callDirect(message) {
  if (!CONFIG.API_KEY) {
    return {
      ok: false,
      text: "No API key configured. Add your Anthropic API key to src/api.js for local testing, or deploy the Azure Function proxy for production use."
    }
  }
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         CONFIG.API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model:      CONFIG.MODEL,
      max_tokens: CONFIG.MAX_TOKENS,
      system:     CONFIG.SYSTEM,
      messages:   [{ role: "user", content: message }]
    })
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    return { ok: false, text: `API error ${response.status}: ${err?.error?.message || "unknown error"}` }
  }
  const data = await response.json()
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("")
  return { ok: true, text: text || "No response returned." }
}

async function callProxy(message) {
  const response = await fetch(CONFIG.PROXY_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ message })
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    return { ok: false, text: `Proxy error ${response.status}: ${err?.error || "unknown error"}` }
  }
  const data = await response.json()
  return { ok: true, text: data.text || "No response returned." }
}
