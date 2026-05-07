/**
 * portal.js — UI logic for the Forcepoint AI Enablement Portal
 * Owner: IT Enterprise AI team · ITEnterpriseAIteam@forcepoint.com
 * Jira:  AI-110
 *
 * Depends on:  js/data.js (content), js/api.js (Claude integration)
 * Entry point: portal object, auto-initialises on DOMContentLoaded
 */

window.portal = (function () {

  const DATA = window.PORTAL_DATA;

  /* ── HELPERS ─────────────────────────────────────────────── */
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function el(id) { return document.getElementById(id); }

  /* ── NAVIGATION ──────────────────────────────────────────── */
  function showSection(id) {
    document.querySelectorAll(".portal-section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

    const sec = el("sec-" + id);
    if (sec) sec.classList.add("active");

    const tab = document.querySelector(`.tab[data-section="${id}"]`);
    if (tab) tab.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── RENDER: HOW-TOS ─────────────────────────────────────── */
  function renderHowtos() {
    const container = el("howtosList");
    if (!container) return;
    container.innerHTML = DATA.howtos.map(item => `
      <div class="list-item">
        <div class="list-body">
          <span class="badge ${esc(item.badgeClass)}">${esc(item.badge)}</span>
          <div class="list-title">${esc(item.title)}</div>
          <div class="list-desc">${esc(item.desc)}</div>
          <button class="try-btn" onclick="portal.askQuick(${JSON.stringify(item.ask)})">Show me how →</button>
        </div>
      </div>`).join("");
  }

  /* ── RENDER: NEWS ────────────────────────────────────────── */
  function renderNews() {
    const container = el("newsList");
    if (!container) return;
    container.innerHTML = DATA.news.map(item => `
      <div class="list-item">
        <div class="list-date">
          <div class="day">${esc(item.day)}</div>
          <div class="month">${esc(item.month)}</div>
        </div>
        <div class="list-body">
          <span class="badge ${esc(item.badgeClass)}">${esc(item.badge)}</span>
          <div class="list-title">${esc(item.title)}</div>
          <div class="list-desc">${esc(item.desc)}</div>
        </div>
      </div>`).join("");
  }

  /* ── RENDER: SKILLS ──────────────────────────────────────── */
  function renderSkills() {
    const container = el("skillsList");
    if (!container) return;
    container.innerHTML = DATA.skills.map((item, i) => `
      <div class="list-item skill-row" data-search="${esc(item.searchText)} ${esc(item.title.toLowerCase())}">
        <div class="list-body">
          <span class="badge ${esc(item.badgeClass)}">${esc(item.badge)}</span>
          <div class="list-title">${esc(item.title)}</div>
          <div class="list-desc">${esc(item.desc)}</div>
          <div class="skill-tags">${item.tags.map(t => `<span class="skill-tag">${esc(t)}</span>`).join("")}</div>
        </div>
      </div>`).join("");
  }

  function filterSkills() {
    const q = (el("skillSearch")?.value || "").toLowerCase().trim();
    document.querySelectorAll(".skill-row").forEach(row => {
      const text = row.getAttribute("data-search") || "";
      row.style.display = (!q || text.includes(q)) ? "" : "none";
    });
  }

  /* ── RENDER: PROMPTS ─────────────────────────────────────── */
  function renderPrompts() {
    const container = el("promptsList");
    if (!container) return;
    container.innerHTML = DATA.prompts.map(item => `
      <div class="prompt-card">
        <span class="badge ${esc(item.badgeClass)}">${esc(item.badge)}</span>
        <div class="prompt-q">"${esc(item.prompt)}"</div>
        <div class="prompt-meta"><span>Submitted by ${esc(item.submittedBy)}</span><span>Rated highly useful</span></div>
        <button class="try-btn" onclick="portal.askQuick(${JSON.stringify(item.ask)})">Try this prompt →</button>
      </div>`).join("");
  }

  /* ── RENDER: EVENTS ──────────────────────────────────────── */
  function renderEvents() {
    const container = el("eventsList");
    if (!container) return;
    container.innerHTML = DATA.events.map(item => `
      <div class="list-item">
        <div class="event-dot ${esc(item.dotClass)}"></div>
        <div class="list-body">
          <div class="list-meta">${esc(item.meta)}</div>
          <div class="list-title">${esc(item.title)}</div>
          <div class="list-desc">${esc(item.desc)}</div>
        </div>
      </div>`).join("");
  }

  /* ── RENDER: AMBASSADOR ──────────────────────────────────── */
  function renderAmbassador() {
    const container = el("ambassadorGrid");
    if (!container) return;
    container.innerHTML = DATA.ambassador.map(item => `
      <div class="amb-card">
        <span class="badge ${esc(item.badgeClass)}">${esc(item.badge)}</span>
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.body)}</p>
      </div>`).join("");
  }

  /* ── RENDER: ARCHITECTURE ────────────────────────────────── */
  function renderArchitecture() {
    const container = el("archBlocks");
    if (!container) return;
    container.innerHTML = DATA.architecture.map(block => `
      <div class="arch-block${block.colorClass ? " " + esc(block.colorClass) : ""}">
        <div class="arch-title">${esc(block.title)}</div>
        <div class="arch-items">${block.items.map(i => esc(i)).join(" · ")}</div>
      </div>`).join("");
  }

  /* ── ASK HERO / ASK QUICK — stubbed pending Copilot integration ── */
  async function askHero()          { /* no-op */ }
  async function askQuick(question) { /* no-op */ }

  /* ── INIT ────────────────────────────────────────────────── */
  function init() {
    // Render all sections
    renderHowtos();
    renderNews();
    renderSkills();
    renderPrompts();
    renderEvents();
    renderAmbassador();
    renderArchitecture();

    // Wire tab clicks
    document.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        const id = tab.getAttribute("data-section");
        if (id) showSection(id);
      });
    });

  }

  document.addEventListener("DOMContentLoaded", init);

  /* ── PUBLIC ──────────────────────────────────────────────── */
  return { showSection, filterSkills, askHero, askQuick };

})();
