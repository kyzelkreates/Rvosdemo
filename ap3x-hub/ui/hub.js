// AP3X — Travel Simulation Demo Hub
// Interactive showcase + live simulation viewer
// All state synced via shared storage layer

import { storage, AP3X_KEYS } from "../../ap3x/core/storage.js";
import { getVehicles, getFleetSummary, onVehiclesChange, VEHICLE_STATUS } from "../../ap3x/core/vehicles.js";
import { getTrips, getTripSummary, onTripsChange } from "../../ap3x/core/trips.js";
import { getEventStream, onEventsChange, isSimulationRunning, startSimulation, pauseSimulation, resetSimulation } from "../../ap3x/engine/simulation-engine.js";

// ─────────────────────────────────────────────
// MOUNT
// ─────────────────────────────────────────────

let _rootEl = null;

const root = document.getElementById("hub-root");
if (root) {
  mount(root);
  onVehiclesChange(() => rerender());
  onTripsChange(() => rerender());
  onEventsChange(() => rerender());
}

function mount(el) {
  _rootEl = el;
  rerender();
}

function rerender() {
  if (!_rootEl) return;
  _rootEl.innerHTML = "";
  _rootEl.className = "hub-fade-in";
  _rootEl.appendChild(buildNav());
  _rootEl.appendChild(buildHero());
  _rootEl.appendChild(buildSimControls());
  _rootEl.appendChild(buildStatsTicker());
  _rootEl.appendChild(buildWatchJourney());
  _rootEl.appendChild(buildFeatures());
  _rootEl.appendChild(buildArchitecture());
  _rootEl.appendChild(buildLaunchPanel());
  _rootEl.appendChild(buildFooter());
}

// ─────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────

function buildNav() {
  const nav = document.createElement("nav");
  nav.className = "hub-nav";
  nav.innerHTML = `
    <div class="hub-nav__logo">
      <div class="hub-nav__dot"></div>
      AP3X
      <span class="hub-nav__logo-badge">Sim Hub</span>
    </div>
    <div class="hub-nav__links">
      <a class="hub-nav__link" href="#simulate">Simulate</a>
      <a class="hub-nav__link" href="#watch">Watch Live</a>
      <a class="hub-nav__link" href="#features">Features</a>
      <a class="hub-nav__link" href="#architecture">Architecture</a>
      <a class="hub-nav__link" href="#launch">Launch</a>
    </div>
  `;
  return nav;
}

// ─────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────

function buildHero() {
  const section = document.createElement("section");
  section.className = "hub-hero";
  section.innerHTML = `
    <div class="hub-hero__bg"></div>
    <div class="hub-hero__grid"></div>
    <div class="hub-hero__content">
      <div class="hub-hero__overline">
        🚌 Simulation Platform
      </div>
      <h1 class="hub-hero__title">
        AP3X Motorhome & RV<br>
        <em>Intelligent Travel Management</em><br>
        Simulation OS
      </h1>
      <p class="hub-hero__sub">
        A live motorhome and RV travel management simulation platform with AI-assisted journey planning,
        real-time trip progression, and cross-device coordination dashboards.
      </p>
      <div class="hub-hero__cta-row">
        <button class="hub-btn hub-btn--primary" id="hero-start-btn">▶ Start Trip Simulation</button>
        <a class="hub-btn hub-btn--secondary" href="#watch">👁 Watch Journey Live</a>
        <a class="hub-btn hub-btn--secondary" href="../ap3x/index.html">🖥 Command OS</a>
      </div>
    </div>
  `;

  section.querySelector("#hero-start-btn").addEventListener("click", () => {
    if (!isSimulationRunning()) startSimulation();
    document.getElementById("watch")?.scrollIntoView({ behavior: "smooth" });
    rerender();
  });

  return section;
}

// ─────────────────────────────────────────────
// SIM CONTROLS
// ─────────────────────────────────────────────

function buildSimControls() {
  const running = isSimulationRunning();
  const section = document.createElement("section");
  section.id = "simulate";
  section.className = "hub-sim-controls";

  // Status
  const status = document.createElement("div");
  status.className = `hub-sim-status hub-sim-status--${running ? "running" : "paused"}`;
  status.innerHTML = `
    <div class="hub-sim-status__dot"></div>
    ${running ? "Simulation Running" : "Simulation Paused"}
  `;
  section.appendChild(status);

  // Start / Pause button
  const startBtn = document.createElement("button");
  startBtn.className = `hub-btn ${running ? "hub-btn--amber" : "hub-btn--primary"}`;
  startBtn.innerHTML = running ? "⏸ Pause Simulation" : "▶ Start Trip Simulation";
  startBtn.addEventListener("click", () => {
    if (running) pauseSimulation(); else startSimulation();
    rerender();
  });
  section.appendChild(startBtn);

  // Reset
  const resetBtn = document.createElement("button");
  resetBtn.className = "hub-btn hub-btn--danger";
  resetBtn.innerHTML = "↺ Reset Journey";
  resetBtn.addEventListener("click", () => {
    if (confirm("Reset all trip data and restart the simulation from scratch?")) {
      resetSimulation();
      rerender();
    }
  });
  section.appendChild(resetBtn);

  // Launch links
  const cmdBtn = document.createElement("a");
  cmdBtn.className = "hub-btn hub-btn--secondary";
  cmdBtn.href = "../ap3x/index.html";
  cmdBtn.textContent = "🖥 Command OS";
  section.appendChild(cmdBtn);

  const pwaBtn = document.createElement("a");
  pwaBtn.className = "hub-btn hub-btn--secondary";
  pwaBtn.href = "../ap3x-pwa/index.html";
  pwaBtn.textContent = "📱 Traveller PWA";
  section.appendChild(pwaBtn);

  return section;
}

// ─────────────────────────────────────────────
// STATS TICKER
// ─────────────────────────────────────────────

function buildStatsTicker() {
  const fleet = getFleetSummary();
  const trips = getTripSummary();
  const events = getEventStream();

  const section = document.createElement("section");
  section.className = "hub-stats-ticker";

  const stats = [
    { num: fleet.total,       label: "Total Vehicles",  color: "var(--blue)" },
    { num: fleet.en_route + fleet.at_stop, label: "Active Journeys", color: "var(--green)" },
    { num: trips.completed,   label: "Trips Completed", color: "var(--amber-2)" },
    { num: fleet.parked,      label: "Vehicles Parked", color: "var(--text-secondary)" },
    { num: fleet.maintenance, label: "In Maintenance",  color: "var(--red)" },
    { num: events.length,     label: "Events Fired",    color: "var(--purple)" }
  ];

  stats.forEach(({ num, label, color }) => {
    const card = document.createElement("div");
    card.className = "hub-ticker-card";
    card.innerHTML = `
      <div class="hub-ticker-card__num" style="color:${color}">${num}</div>
      <div class="hub-ticker-card__label">${label}</div>
    `;
    section.appendChild(card);
  });

  return section;
}

// ─────────────────────────────────────────────
// WATCH JOURNEY LIVE
// ─────────────────────────────────────────────

function buildWatchJourney() {
  const vehicles = getVehicles();
  const events   = getEventStream().slice(0, 12);
  const trips    = getTrips();
  const activeTrip = trips.find(t => t.status === "en_route" || t.status === "at_stop" || t.status === "departed");

  const section = document.createElement("section");
  section.id = "watch";
  section.className = "hub-watch";
  section.innerHTML = `
    <div class="hub-section-title">👁 Watch Journey Live</div>
    <div class="hub-section-sub">Visually track active motorhome journeys as the simulation engine progresses each trip in real-time.</div>
  `;

  const viewer = document.createElement("div");
  viewer.className = "hub-journey-viewer";

  // Header
  const hdr = document.createElement("div");
  hdr.className = "hub-journey-viewer__header";

  const title = document.createElement("div");
  title.className = "hub-journey-viewer__title";
  title.textContent = activeTrip
    ? `🛣️ Tracking: ${activeTrip.vehicle_name} — ${activeTrip.route_name}`
    : "🗺️ No active journey — start the simulation to begin tracking";
  hdr.appendChild(title);

  if (activeTrip) {
    const badge = document.createElement("span");
    badge.className = `hub-badge hub-badge--${activeTrip.status === "at_stop" ? "amber" : "blue"}`;
    badge.textContent = activeTrip.status === "at_stop" ? "At Stop" : "En Route";
    hdr.appendChild(badge);
  }
  viewer.appendChild(hdr);

  // Body: map + events side by side
  const body = document.createElement("div");
  body.className = "hub-journey-viewer__body";

  // Map
  const mapEl = document.createElement("div");
  mapEl.className = "hub-journey-map";
  const mapGrid = document.createElement("div");
  mapGrid.className = "hub-journey-map__grid";
  mapEl.appendChild(mapGrid);

  const vehiclesEl = document.createElement("div");
  vehiclesEl.className = "hub-journey-map__vehicles";

  const positions = [
    { left:"12%", top:"18%" }, { left:"38%", top:"42%" },
    { left:"62%", top:"22%" }, { left:"72%", top:"62%" },
    { left:"22%", top:"68%" }, { left:"52%", top:"72%" }
  ];

  vehicles.forEach((v, i) => {
    const pos = positions[i % positions.length];
    const dot = document.createElement("div");
    dot.className = `hub-map-dot${v.status === VEHICLE_STATUS.EN_ROUTE ? " hub-map-dot--moving" : ""}`;
    dot.style.left = pos.left;
    dot.style.top  = pos.top;
    dot.innerHTML  = `
      <div class="hub-map-dot__emoji">${v.image_tag}</div>
      <div class="hub-map-dot__label">${v.name}</div>
    `;
    vehiclesEl.appendChild(dot);
  });
  mapEl.appendChild(vehiclesEl);
  body.appendChild(mapEl);

  // Events panel
  const evtsEl = document.createElement("div");
  evtsEl.className = "hub-journey-events";

  if (events.length === 0) {
    evtsEl.innerHTML = `<div style="padding:var(--sp-lg);text-align:center;color:var(--text-muted);font-size:0.85rem">No events yet — start the simulation to see live updates here.</div>`;
  } else {
    events.forEach(evt => {
      const el = document.createElement("div");
      const colorMap = {
        TRIP_STARTED: "blue", DEPARTURE: "blue",
        STOP_REACHED: "amber",
        TRIP_COMPLETED: "green", DELAY_RESOLVED: "green",
        DELAY_SIMULATED: "red", MAINTENANCE_EVENT: "red"
      };
      const cls = colorMap[evt.type] || "blue";
      el.className = `hub-evt hub-evt--${cls}`;
      el.innerHTML = `
        <div class="hub-evt__msg">${evt.payload?.message || evt.type}</div>
        <div class="hub-evt__time">${new Date(evt.timestamp).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}</div>
      `;
      evtsEl.appendChild(el);
    });
  }
  body.appendChild(evtsEl);
  viewer.appendChild(body);

  // Progress bar for active trip
  if (activeTrip) {
    const progWrap = document.createElement("div");
    progWrap.style.padding = "var(--sp-md) var(--sp-lg)";
    progWrap.style.borderTop = "1px solid var(--border)";
    progWrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:6px">
        <span>${activeTrip.departure}</span>
        <span style="font-weight:600;color:var(--blue)">${activeTrip.progress_pct}% complete</span>
        <span>${activeTrip.destination}</span>
      </div>
      <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${activeTrip.progress_pct}%;background:linear-gradient(90deg,var(--blue),var(--blue-2));border-radius:4px;transition:width 1s ease"></div>
      </div>
      <div style="margin-top:6px;font-size:0.75rem;color:var(--text-muted)">Stops: ${activeTrip.stops.join(" → ")}</div>
    `;
    viewer.appendChild(progWrap);
  }

  section.appendChild(viewer);
  return section;
}

// ─────────────────────────────────────────────
// FEATURES
// ─────────────────────────────────────────────

function buildFeatures() {
  const section = document.createElement("section");
  section.id = "features";
  section.className = "hub-features";
  section.innerHTML = `
    <div class="hub-section-title">🚀 Platform Features</div>
    <div class="hub-section-sub">Everything you need for a full motorhome fleet simulation experience.</div>
    <div class="hub-features-grid">
      <div class="hub-feature-card">
        <div class="hub-feature-card__icon">🗺️</div>
        <div class="hub-feature-card__title">Trip Generator Engine</div>
        <div class="hub-feature-card__desc">Automatically generates realistic travel journeys across 4 curated US routes — departure, multi-stop itinerary, and destination timelines.</div>
      </div>
      <div class="hub-feature-card">
        <div class="hub-feature-card__icon">🚐</div>
        <div class="hub-feature-card__title">Vehicle State Engine</div>
        <div class="hub-feature-card__desc">Live simulation of 6 motorhomes across states: Parked, En Route, At Stop, Maintenance, and Completed. Status updates automatically.</div>
      </div>
      <div class="hub-feature-card">
        <div class="hub-feature-card__icon">📡</div>
        <div class="hub-feature-card__title">Live Event Stream</div>
        <div class="hub-feature-card__desc">Real-time event feed: trip started, stop reached, delay simulated, maintenance events, and journey completions — all cross-synced.</div>
      </div>
      <div class="hub-feature-card">
        <div class="hub-feature-card__icon">🤖</div>
        <div class="hub-feature-card__title">Travel Intelligence AI</div>
        <div class="hub-feature-card__desc">AP3X Travel Intelligence provides route insights, next stop recommendations, fuel planning tips, and fleet summaries — simulation context only.</div>
      </div>
      <div class="hub-feature-card">
        <div class="hub-feature-card__icon">📱</div>
        <div class="hub-feature-card__title">Traveller PWA</div>
        <div class="hub-feature-card__desc">Mobile-first progressive web app for travellers — trip overview, stop-by-stop itinerary, travel checklist, and AI chat assistant.</div>
      </div>
      <div class="hub-feature-card">
        <div class="hub-feature-card__icon">🖥️</div>
        <div class="hub-feature-card__title">Command OS Dashboard</div>
        <div class="hub-feature-card__desc">Full fleet management dashboard — live map, trip monitor, vehicle allocation panel, fleet status heatmap, and AI insights panel.</div>
      </div>
    </div>
  `;
  return section;
}

// ─────────────────────────────────────────────
// ARCHITECTURE
// ─────────────────────────────────────────────

function buildArchitecture() {
  const section = document.createElement("section");
  section.id = "architecture";
  section.className = "hub-arch";
  section.innerHTML = `
    <div class="hub-section-title">⚙️ System Architecture</div>
    <div class="hub-section-sub">Three fully independent but cross-synced systems sharing a unified state layer.</div>
    <div class="hub-arch-grid">
      <div class="hub-arch-card">
        <div class="hub-arch-card__label">System 1</div>
        <div class="hub-arch-card__name">🖥️ AP3X Command OS</div>
        <div class="hub-arch-card__desc">Desktop fleet management dashboard. Monitors all vehicles, trips, and events from a single control centre.</div>
        <div class="hub-arch-card__items">
          <div class="hub-arch-card__item">Fleet Map (simulated)</div>
          <div class="hub-arch-card__item">Trip Timeline Viewer</div>
          <div class="hub-arch-card__item">Vehicle Allocation Panel</div>
          <div class="hub-arch-card__item">Status Heatmap</div>
          <div class="hub-arch-card__item">AI Travel Insights</div>
        </div>
      </div>
      <div class="hub-arch-card">
        <div class="hub-arch-card__label">System 2</div>
        <div class="hub-arch-card__name">📱 RV Traveller PWA</div>
        <div class="hub-arch-card__desc">Mobile progressive web app for travellers. Track your assigned motorhome journey from your phone.</div>
        <div class="hub-arch-card__items">
          <div class="hub-arch-card__item">Trip Overview Card</div>
          <div class="hub-arch-card__item">Stop-by-Stop Itinerary</div>
          <div class="hub-arch-card__item">Next Stop Navigation UI</div>
          <div class="hub-arch-card__item">Travel Checklist System</div>
          <div class="hub-arch-card__item">AI Travel Assistant</div>
        </div>
      </div>
      <div class="hub-arch-card">
        <div class="hub-arch-card__label">System 3</div>
        <div class="hub-arch-card__name">🌐 Simulation Hub</div>
        <div class="hub-arch-card__desc">Interactive demo and showcase site. Start, pause, and watch the simulation. Launch either system from here.</div>
        <div class="hub-arch-card__items">
          <div class="hub-arch-card__item">Start / Pause / Reset Controls</div>
          <div class="hub-arch-card__item">Live Journey Viewer</div>
          <div class="hub-arch-card__item">Live Stats Ticker</div>
          <div class="hub-arch-card__item">System Launch Panel</div>
          <div class="hub-arch-card__item">Architecture Overview</div>
        </div>
      </div>
      <div class="hub-arch-card">
        <div class="hub-arch-card__label">Shared Core</div>
        <div class="hub-arch-card__name">⚡ Simulation Engine</div>
        <div class="hub-arch-card__desc">Cross-system state layer keeping all three systems in sync via reactive localStorage subscriptions.</div>
        <div class="hub-arch-card__items">
          <div class="hub-arch-card__item">Trip Generator Engine</div>
          <div class="hub-arch-card__item">Vehicle State Engine</div>
          <div class="hub-arch-card__item">Event Stream System</div>
          <div class="hub-arch-card__item">AI Intelligence Layer</div>
          <div class="hub-arch-card__item">Cross-tab Reactivity</div>
        </div>
      </div>
    </div>
  `;
  return section;
}

// ─────────────────────────────────────────────
// LAUNCH PANEL
// ─────────────────────────────────────────────

function buildLaunchPanel() {
  const section = document.createElement("section");
  section.id = "launch";
  section.className = "hub-launch";
  section.innerHTML = `
    <div class="hub-section-title">🚀 Launch the System</div>
    <div class="hub-section-sub">Open either system directly. Both share the same simulation state in real time.</div>
  `;

  const grid = document.createElement("div");
  grid.className = "hub-launch-grid";

  // Command OS card
  const cmdCard = document.createElement("div");
  cmdCard.className = "hub-launch-card hub-launch-card--command";
  cmdCard.innerHTML = `
    <div class="hub-launch-card__icon">🖥️</div>
    <div class="hub-launch-card__name">AP3X Command OS</div>
    <div class="hub-launch-card__desc">Full fleet management dashboard. Best experienced on desktop. Monitor all vehicles, trips, events, and AI insights from a single control centre.</div>
    <a class="hub-btn hub-btn--primary hub-btn--full" href="../ap3x/index.html">Open Command OS →</a>
  `;
  grid.appendChild(cmdCard);

  // Traveller PWA card
  const pwaCard = document.createElement("div");
  pwaCard.className = "hub-launch-card hub-launch-card--traveller";
  pwaCard.innerHTML = `
    <div class="hub-launch-card__icon">📱</div>
    <div class="hub-launch-card__name">RV Traveller Interface</div>
    <div class="hub-launch-card__desc">Mobile-first PWA for travellers. Track your trip, view your stop itinerary, complete your travel checklist, and chat with the AI travel assistant.</div>
    <a class="hub-btn hub-btn--amber hub-btn--full" href="../ap3x-pwa/index.html">Open Traveller PWA →</a>
  `;
  grid.appendChild(pwaCard);

  section.appendChild(grid);
  return section;
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────

function buildFooter() {
  const footer = document.createElement("footer");
  footer.className = "hub-footer";
  footer.innerHTML = `
    <p><strong>AP3X Motorhome & RV Intelligent Travel Management Simulation OS</strong></p>
    <p style="margin-top:6px">For simulation and demonstration purposes only. Not real-world vehicle control, navigation, or safety software. No real driving instructions are provided.</p>
  `;
  return footer;
}
