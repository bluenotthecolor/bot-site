// ============================================================================
// Lana dashboard — client-side only (this site is static, no backend).
//
// Uses Discord's implicit OAuth2 grant: it returns an access token straight
// to the browser, so no client secret is ever needed here. That token only
// proves who the logged-in USER is — it can list which servers they can
// manage, but it can NOT run bot actions like kick/ban (those require the
// bot's own token, which must never live in client-side code).
// ============================================================================

// TODO: fill these in from https://discord.com/developers/applications
const DISCORD_CLIENT_ID = "1518226820330291346";

// Must exactly match a redirect registered in the Discord Developer Portal
// (OAuth2 -> General -> Redirects), e.g. https://you.github.io/bot-site/dashboard/
const REDIRECT_URI = window.location.origin + window.location.pathname;

const SCOPE = "identify guilds";
const TOKEN_STORAGE_KEY = "lana_access_token";
const SELECTED_GUILD_KEY = "lana_selected_guild";

const PERM_ADMINISTRATOR = 0x8n;
const PERM_MANAGE_GUILD = 0x20n;

const heroGuest = document.getElementById("hero-guest");
const heroUser = document.getElementById("hero-user");
const guildGrid = document.getElementById("guild-grid");
const guildEmpty = document.getElementById("guild-empty");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const statusBanner = document.getElementById("status-banner");

function showStatus(message) {
  statusBanner.textContent = message;
  statusBanner.hidden = false;
  setTimeout(() => {
    statusBanner.hidden = true;
  }, 4000);
}

function buildAuthUrl() {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "token",
    scope: SCOPE,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

function goToLogin() {
  if (DISCORD_CLIENT_ID === "YOUR_DISCORD_CLIENT_ID") {
    showStatus(
      "Set DISCORD_CLIENT_ID in js/dashboard.js before this button will work.",
    );
    return;
  }
  window.location.href = buildAuthUrl();
}

function parseTokenFromHash() {
  if (!window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("access_token");
  return token;
}

function getStoredToken() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

function storeToken(token) {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

function canManageGuild(guild) {
  // guild.permissions comes back as a string because it can exceed
  // Number's safe integer range — BigInt keeps the bitmask check exact.
  const perms = BigInt(guild.permissions);
  return (
    (perms & PERM_ADMINISTRATOR) !== 0n || (perms & PERM_MANAGE_GUILD) !== 0n
  );
}

function guildIconUrl(guild) {
  if (!guild.icon) return null;
  const ext = guild.icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=64`;
}

// Stashed for the manage page so it doesn't have to re-fetch /users/@me/guilds
// just to know the name/icon of the one server it's showing.
function storeSelectedGuild(guild, iconUrl) {
  sessionStorage.setItem(
    SELECTED_GUILD_KEY,
    JSON.stringify({
      id: guild.id,
      name: guild.name,
      icon: iconUrl,
      owner: !!guild.owner,
    }),
  );
}

function goToManageGuild(guild, iconUrl) {
  storeSelectedGuild(guild, iconUrl);
  window.location.href = `manage/index.html?guild=${guild.id}`;
}

function renderGuilds(guilds) {
  guildGrid.innerHTML = "";

  if (guilds.length === 0) {
    guildEmpty.hidden = false;
    return;
  }
  guildEmpty.hidden = true;

  for (const guild of guilds) {
    const card = document.createElement("button");
    card.className = "guild-card";
    card.type = "button";

    const iconUrl = guildIconUrl(guild);
    const iconHtml = iconUrl
      ? `<img class="guild-icon" src="${iconUrl}" alt="">`
      : `<div class="guild-icon-fallback">${escapeHtml(guild.name.charAt(0))}</div>`;

    card.innerHTML = `
      ${iconHtml}
      <span class="guild-card-name">${escapeHtml(guild.name)}</span>
      <span class="guild-card-tag">${guild.owner ? "Owner" : "Manager"} · Manage server</span>
    `;

    // Each server is handled on its own page — nothing about one server's
    // settings ever touches another's.
    card.addEventListener("click", () => {
      goToManageGuild(guild, iconUrl);
    });

    guildGrid.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showLoggedOut() {
  heroGuest.hidden = false;
  heroUser.hidden = true;
  document.getElementById("nav-auth-btn").textContent = "Login with Discord";
  document.getElementById("nav-auth-btn").onclick = goToLogin;
}

function showLoggedIn(user) {
  heroGuest.hidden = true;
  heroUser.hidden = false;

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`;

  userAvatar.src = avatarUrl;
  userAvatar.alt = user.username;
  userName.textContent = user.global_name || user.username;

  document.getElementById("nav-auth-btn").textContent = "Log out";
  document.getElementById("nav-auth-btn").onclick = logout;
}

function logout() {
  clearToken();
  sessionStorage.removeItem(SELECTED_GUILD_KEY);
  showLoggedOut();
}

async function loadDashboard(token) {
  const headers = { Authorization: `Bearer ${token}` };

  const [userRes, guildsRes] = await Promise.all([
    fetch("https://discord.com/api/users/@me", { headers }),
    fetch("https://discord.com/api/users/@me/guilds", { headers }),
  ]);

  if (userRes.status === 401 || guildsRes.status === 401) {
    throw new Error("expired-token");
  }
  if (!userRes.ok || !guildsRes.ok) {
    throw new Error("discord-api-error");
  }

  const user = await userRes.json();
  const guilds = await guildsRes.json();
  const manageable = guilds.filter(canManageGuild);

  showLoggedIn(user);
  renderGuilds(manageable);
}

async function init() {
  let token = parseTokenFromHash();

  if (token) {
    storeToken(token);
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  } else {
    token = getStoredToken();
  }

  if (!token) {
    showLoggedOut();
    return;
  }

  try {
    await loadDashboard(token);
  } catch (err) {
    clearToken();
    showLoggedOut();
    if (err.message === "expired-token") {
      showStatus("Your session expired — please log in again.");
    } else {
      showStatus("Couldn't reach Discord right now. Try again in a moment.");
    }
  }
}

document.getElementById("hero-login-btn").addEventListener("click", goToLogin);
document.getElementById("logout-btn").addEventListener("click", logout);

init();
