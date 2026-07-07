const grid = document.getElementById("commandsGrid");
const searchInput = document.getElementById("commandSearch");
const categoryList = document.querySelector(".category-list");

let commands = [];
let currentCategory = "all";

// Load commands from Supabase
async function loadCommands() {
  const { data, error } = await db
    .from("commands")
    .select("*")
    .eq("enabled", true)
    .order("category")
    .order("name");

  if (error) {
    console.error(error);

    grid.innerHTML = `
      <div class="empty-state">
        Failed to load commands.
      </div>
    `;

    return;
  }

  commands = data || [];

  buildCategories();

  renderCommands();
}

// Build category buttons automatically
function buildCategories() {
  const categories = ["all", ...new Set(commands.map((cmd) => cmd.category))];

  categoryList.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");

    button.className = "category" + (category === "all" ? " active" : "");

    button.dataset.category = category;

    button.textContent = category === "all" ? "All" : category;

    button.addEventListener("click", () => {
      document
        .querySelectorAll(".category")
        .forEach((b) => b.classList.remove("active"));

      button.classList.add("active");

      currentCategory = category;

      renderCommands();
    });

    categoryList.appendChild(button);
  });
}

// Render command cards
function renderCommands() {
  const query = searchInput.value.toLowerCase();

  grid.innerHTML = "";

  const filtered = commands.filter((cmd) => {
    const categoryMatch =
      currentCategory === "all" || cmd.category === currentCategory;

    const searchMatch =
      cmd.name.toLowerCase().includes(query) ||
      (cmd.description || "").toLowerCase().includes(query);

    return categoryMatch && searchMatch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        No commands found.
      </div>
    `;
    return;
  }

  filtered.forEach((cmd) => {
    const card = document.createElement("div");

    card.className = "command-card";

    card.innerHTML = `
      <div class="command-header">
        <h3>!${cmd.name}</h3>
        <span class="command-tag">${cmd.category}</span>
      </div>

      <p class="command-description">
        ${cmd.description || "No description."}
      </p>

      <div class="command-section">
        <span>Usage</span>

        <code>${cmd.usage || "!" + cmd.name}</code>
      </div>

      <div class="command-section">
        <span>Aliases</span>

        <code>${
          Array.isArray(cmd.aliases)
            ? cmd.aliases.join(", ")
            : cmd.aliases || "None"
        }</code>
      </div>

      <div class="command-section">
        <span>Permissions</span>

        <code>${cmd.permissions || "None"}</code>
      </div>

      <button class="primary-btn copy-btn">
        Copy Command
      </button>
    `;

    const copyButton = card.querySelector(".copy-btn");

    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(cmd.usage || "!" + cmd.name);

      copyButton.textContent = "Copied!";

      setTimeout(() => {
        copyButton.textContent = "Copy Command";
      }, 1500);
    });

    grid.appendChild(card);
  });
}

// Search
searchInput.addEventListener("input", renderCommands);

// Start
loadCommands();
