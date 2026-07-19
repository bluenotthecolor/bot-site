// ============================================================================
// Lana manage page — shows the single server picked on the dashboard.
// No bot-token actions happen here yet; this just establishes the per-server
// page and wires up the one real sub-feature that already exists
// (the webhook editor). Everything else is a placeholder module card.
// ============================================================================

const TOKEN_STORAGE_KEY = "lana_access_token";
const SELECTED_GUILD_KEY = "lana_selected_guild";

const MODULES = [
  {
    title: "Webhook Editor",
    desc: "Build a message — content, embeds, buttons — and send it straight to this server.",
    href: "../../webhook/index.html",
    live: true,
  },
  {
    title: "Welcome Messages",
    desc: "Greet new members automatically when they join.",
    live: false,
  },
  {
    title: "Auto Roles",
    desc: "Hand out a role the moment someone joins the server.",
    live: false,
  },
  {
    title: "Moderation",
    desc: "Warnings, timeouts, and a log of what got actioned.",
    live: false,
  },
  {
    title: "Logging",
    desc: "Send message edits, deletes, and joins to a log channel.",
    live: false,
  },
];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getStoredToken() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

function getSelectedGuild() {
  const raw = sessionStorage.getItem(SELECTED_GUILD_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function moduleIconSvg() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`;
}

function renderGuard(message) {
  document.getElementById("app").innerHTML = `
    <div class="guard-state">
      <h1>Can't open that server</h1>
      <p>${escapeHtml(message)}</p>
      <a class="btn btn-primary" href="../index.html">Back to dashboard</a>
    </div>
  `;
}

function renderManagePage(guild) {
  const iconHtml = guild.icon
    ? `<img class="server-icon" src="${guild.icon}" alt="">`
    : `<div class="server-icon-fallback">${escapeHtml(guild.name.charAt(0))}</div>`;

  const moduleCards = MODULES.map((m) => {
    const tag = m.live
      ? `<span class="module-pill live">Open</span>`
      : `<span class="module-pill soon">Coming soon</span>`;
    const cls = m.live ? "module-card is-live" : "module-card is-soon";
    const tagEl = m.live ? "a" : "div";
    const hrefAttr = m.live ? `href="${m.href}"` : "";
    return `
      <${tagEl} class="${cls}" ${hrefAttr}>
        <div class="module-card-top">
          <div class="module-icon">${moduleIconSvg()}</div>
          ${tag}
        </div>
        <div>
          <p class="module-title">${escapeHtml(m.title)}</p>
          <p class="module-desc">${escapeHtml(m.desc)}</p>
        </div>
      </${tagEl}>
    `;
  }).join("");

  document.getElementById("app").innerHTML = `
    <div class="server-header">
      ${iconHtml}
      <div class="server-meta">
        <h1 class="server-name">${escapeHtml(guild.name)}</h1>
        <span class="server-role-badge">${guild.owner ? "Owner" : "Manager"}</span>
      </div>
    </div>
    <div class="module-section">
      <h2 class="module-section-title">Manage this server</h2>
      <div class="module-grid">${moduleCards}</div>
    </div>
  `;
}

function init() {
  const token = getStoredToken();
  if (!token) {
    renderGuard("You need to be logged in to manage a server.");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const guildIdFromUrl = params.get("guild");
  const guild = getSelectedGuild();

  if (!guild || (guildIdFromUrl && guild.id !== guildIdFromUrl)) {
    renderGuard(
      "That server wasn't found in this session. Pick it again from your dashboard.",
    );
    return;
  }

  document.getElementById("nav-logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(SELECTED_GUILD_KEY);
    window.location.href = "../index.html";
  });

  renderManagePage(guild);
}

init();
