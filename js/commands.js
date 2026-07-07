import { supabase } from "./supabase.js";

const container = document.getElementById("commands-container");
const search = document.getElementById("search");

let allCommands = [];

async function loadCommands() {
  const { data, error } = await supabase
    .from("commands")
    .select("*")
    .eq("enabled", true)
    .order("category")
    .order("name");

  if (error) {
    console.error(error);
    return;
  }

  allCommands = data;

  render(allCommands);
}

function render(commands) {
  container.innerHTML = "";

  const groups = {};

  commands.forEach((cmd) => {
    if (!groups[cmd.category]) groups[cmd.category] = [];

    groups[cmd.category].push(cmd);
  });

  Object.keys(groups).forEach((category) => {
    const section = document.createElement("div");

    section.className = "command-category";

    section.innerHTML = `<h2>${category}</h2>`;

    groups[category].forEach((cmd) => {
      const card = document.createElement("div");

      card.className = "command-card";

      card.innerHTML = `

            <div class="command-top">

                <h3>!${cmd.name}</h3>

                <button class="copy">Copy</button>

            </div>

            <p>${cmd.description}</p>

            <code>${cmd.usage}</code>

            `;

      card.querySelector(".copy").onclick = () => {
        navigator.clipboard.writeText("!" + cmd.name);

        card.querySelector(".copy").innerText = "Copied";

        setTimeout(() => {
          card.querySelector(".copy").innerText = "Copy";
        }, 1000);
      };

      section.appendChild(card);
    });

    container.appendChild(section);
  });
}

search.addEventListener("input", () => {
  const value = search.value.toLowerCase();

  render(
    allCommands.filter(
      (c) =>
        c.name.toLowerCase().includes(value) ||
        c.description.toLowerCase().includes(value) ||
        c.category.toLowerCase().includes(value),
    ),
  );
});

loadCommands();
