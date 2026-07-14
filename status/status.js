async function updateStatusPage() {
  const startTime = Date.now();

  const gatewayEl = document.getElementById("gateway");
  const apiEl = document.getElementById("api");
  const guildsEl = document.getElementById("guilds");
  const usersEl = document.getElementById("users");
  const uptimeEl = document.getElementById("uptime");
  const overallTextEl = document.getElementById("overallText");
  const statusDotEl = document.querySelector(".status-dot");
  const updatedEl = document.getElementById("updated");

  try {
    // Change 'supabase.from' to 'db.from' to match your initialization file
    const { data, error } = await db
      .from("bot_status")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) throw error;

    const apiLatency = Date.now() - startTime;

    // Populate fields with fallback logic
    guildsEl.textContent =
      data.guilds !== undefined ? data.guilds.toLocaleString() : "0";
    usersEl.textContent =
      data.users !== undefined ? data.users.toLocaleString() : "0";
    gatewayEl.textContent = `${data.latency || 0}ms`;
    apiEl.textContent = `${apiLatency}ms`; // Response latency from Supabase
    uptimeEl.textContent = data.status === "online" ? "Online" : "Offline";

    if (data.status === "online") {
      overallTextEl.textContent = "All Systems Operational";
      statusDotEl.style.backgroundColor = "#2ecc71";
    } else {
      setOfflineState();
    }
  } catch (error) {
    console.error("Supabase status fetch failed:", error);
    setOfflineState();
  } finally {
    updatedEl.textContent = new Date().toLocaleTimeString();
  }

  function setOfflineState() {
    gatewayEl.textContent = "--";
    apiEl.textContent = "--";
    guildsEl.textContent = "--";
    usersEl.textContent = "--";
    uptimeEl.textContent = "Offline";
    overallTextEl.textContent = "Systems Experiencing Issues";
    statusDotEl.style.backgroundColor = "#e74c3c";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateStatusPage();
  // Re-check and sync statistics every 60 seconds (1 minute)
  setInterval(updateStatusPage, 60000);
});
