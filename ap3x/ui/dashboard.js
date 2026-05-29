// AP3X — ui/dashboard.js
// AP3X Motorhome & RV Command OS — Main Dashboard
// Architecture preserved from NDOS (same mount/navigate/render pattern)

import { getVehicles, getFleetSummary, onVehiclesChange, VEHICLE_STATUS } from "../core/vehicles.js";
import { getTrips, getTripSummary, getActiveTrip, setActiveTrip, onTripsChange } from "../core/trips.js";
import { getEventStream, onEventsChange, isSimulationRunning, startSimulation, pauseSimulation, resetSimulation } from "../engine/simulation-engine.js";
import { getAIMessages, pushAIMessage, onAIMessagesChange, answerTravelQuery, generateFleetSummary, generateTripInsight } from "../engine/ai-assistant.js";

// ─────────────────────────────────────────────
// MOUNT + STATE
// ─────────────────────────────────────────────

let _mountEl = null;
let _view = "overview"; // overview | fleet | trips | events | ai | allocation

export function mountDashboard(el) {
  if (!el) throw new Error("[AP3X] Mount element not found.");
  _mountEl = el;
  _render();

  onVehiclesChange(() => _render());
  onTripsChange(() => _render());
  onEventsChange(() => _render());
  onAIMessagesChange(() => _render());
}

export function navigate(view) {
  _view = view;
  _render();
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function _render() {
  if (!_mountEl) return;
  _mountEl.innerHTML = "";
  _mountEl.className = "ap3x-app ap3x-fade-in";
  _mountEl.appendChild(_topBar());

  const layout = document.createElement("div");
  layout.className = "ap3x-layout";
  layout.appendChild(_sidebar());

  const main = document.createElement("main");
  main.className = "ap3x-main";

  switch (_view) {
    case "overview":   main.appendChild(_viewOverview()); break;
    case "fleet":      main.appendChild(_viewFleet()); break;
    case "trips":      main.appendChild(_viewTrips()); break;
    case "events":     main.appendChild(_viewEvents()); break;
    case "ai":         main.appendChild(_viewAI()); break;
    case "allocation": main.appendChild(_viewAllocation()); break;
    default:           main.appendChild(_viewOverview());
  }

  main.appendChild(_disclaimer());
  layout.appendChild(main);
  _mountEl.appendChild(layout);
}

// ─────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────

function _topBar() {
  const running = isSimulationRunning();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const bar = document.createElement("header");
  bar.className = "ap3x-topbar";
  bar.innerHTML = `
    <div class="ap3x-topbar__logo">
      <div class="ap3x-topbar__dot"></div>
      AP3X
      <span class="ap3x-topbar__logo-badge">Command OS</span>
    </div>
    <div class="ap3x-topbar__center">${dateStr} — ${timeStr}</div>
    <div class="ap3x-topbar__right">
      <div class="ap3x-sim-badge ap3x-sim-badge--${running ? "running" : "paused"}">
        <div class="ap3x-sim-badge__dot"></div>
        ${running ? "Simulation Running" : "Simulation Paused"}
      </div>
    </div>
  `;
  return bar;
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────

function _sidebar() {
  const nav = [
    { id: "overview",   icon: "🏠", label: "Overview" },
    { id: "fleet",      icon: "🚌", label: "Fleet Map" },
    { id: "trips",      icon: "🗺️",  label: "Trip Monitor" },
    { id: "allocation", icon: "📋", label: "Allocation" },
    { id: "events",     icon: "📡", label: "Event Stream" },
    { id: "ai",         icon: "🤖", label: "AI Insights" }
  ];

  const aside = document.createElement("aside");
  aside.className = "ap3x-sidebar";

  const lbl = document.createElement("div");
  lbl.className = "ap3x-sidebar__label";
  lbl.textContent = "Navigation";
  aside.appendChild(lbl);

  nav.forEach(({ id, icon, label }) => {
    const btn = document.createElement("button");
    btn.className = `ap3x-nav-btn${_view === id ? " active" : ""}`;
    btn.innerHTML = `<span class="ap3x-nav-btn__icon">${icon}</span>${label}`;
    btn.addEventListener("click", () => navigate(id));
    aside.appendChild(btn);
  });

  // Sim controls section
  const simLbl = document.createElement("div");
  simLbl.className = "ap3x-sidebar__label";
  simLbl.textContent = "Simulation";
  aside.appendChild(simLbl);

  const running = isSimulationRunning();

  const startBtn = document.createElement("button");
  startBtn.className = `ap3x-nav-btn${running ? "" : ""}`;
  startBtn.innerHTML = `<span class="ap3x-nav-btn__icon">▶</span>${running ? "Pause Sim" : "Start Sim"}`;
  startBtn.style.color = running ? "var(--accent-amber-2)" : "var(--accent-green)";
  startBtn.addEventListener("click", () => {
    if (running) pauseSimulation(); else startSimulation();
    _render();
  });
  aside.appendChild(startBtn);

  const resetBtn = document.createElement("button");
  resetBtn.className = "ap3x-nav-btn";
  resetBtn.innerHTML = `<span class="ap3x-nav-btn__icon">↺</span>Reset Journey`;
  resetBtn.addEventListener("click", () => {
    if (confirm("Reset all trip data and restart simulation?")) {
      resetSimulation();
      _render();
    }
  });
  aside.appendChild(resetBtn);

  return aside;
}

// ─────────────────────────────────────────────
// VIEW: OVERVIEW
// ─────────────────────────────────────────────

function _viewOverview() {
  const fleet = getFleetSummary();
  const trips = getTripSummary();
  const events = getEventStream().slice(0, 5);
  const frag = document.createDocumentFragment();

  // Header
  const header = document.createElement("div");
  header.className = "ap3x-page-header";
  header.innerHTML = `
    <div>
      <div class="ap3x-page-title">🚌 Motorhome Command OS</div>
      <div class="ap3x-page-sub">AP3X Motorhome & RV Intelligent Travel Management Simulation OS</div>
    </div>
  `;
  const simBtn = document.createElement("button");
  simBtn.className = `ap3x-btn ap3x-btn--${isSimulationRunning() ? "amber" : "primary"}`;
  simBtn.textContent = isSimulationRunning() ? "⏸ Pause Simulation" : "▶ Start Simulation";
  simBtn.addEventListener("click", () => {
    if (isSimulationRunning()) pauseSimulation(); else startSimulation();
    _render();
  });
  header.appendChild(simBtn);
  frag.appendChild(header);

  // Stat row - Fleet
  const statRow = document.createElement("div");
  statRow.className = "ap3x-stat-row";
  const fleetStats = [
    { val: fleet.total,       lbl: "Total Vehicles",  color: "var(--accent-blue)" },
    { val: fleet.en_route,    lbl: "En Route",        color: "var(--status-en-route)" },
    { val: fleet.at_stop,     lbl: "At Stop",         color: "var(--status-at-stop)" },
    { val: fleet.parked,      lbl: "Parked",          color: "var(--status-parked)" },
    { val: fleet.maintenance, lbl: "Maintenance",     color: "var(--status-maintenance)" },
    { val: trips.active,      lbl: "Active Trips",    color: "var(--accent-green)" }
  ];
  fleetStats.forEach(({ val, lbl, color }) => {
    const c = document.createElement("div");
    c.className = "ap3x-stat-card";
    c.style.borderLeftColor = color;
    c.style.borderLeftWidth = "3px";
    c.innerHTML = `
      <div class="ap3x-stat-card__value" style="color:${color}">${val}</div>
      <div class="ap3x-stat-card__label">${lbl}</div>
    `;
    statRow.appendChild(c);
  });
  frag.appendChild(statRow);

  // Map + Events grid
  const grid = document.createElement("div");
  grid.className = "ap3x-grid-2";

  grid.appendChild(_buildFleetMap());

  // Event stream panel
  const evtPanel = document.createElement("div");
  evtPanel.className = "ap3x-panel";
  evtPanel.innerHTML = `<div class="ap3x-panel__header"><div class="ap3x-panel__title">📡 Live Event Stream</div></div>`;
  const evtBody = document.createElement("div");
  evtBody.className = "ap3x-panel__body--scroll";
  if (events.length === 0) {
    evtBody.innerHTML = `<div class="ap3x-empty"><div class="ap3x-empty__icon">📡</div><div class="ap3x-empty__title">No events yet</div><div class="ap3x-empty__sub">Start the simulation to see live trip events.</div></div>`;
  } else {
    const list = document.createElement("div");
    list.className = "ap3x-event-list";
    events.forEach(evt => list.appendChild(_buildEventItem(evt)));
    evtBody.appendChild(list);
  }
  evtPanel.appendChild(evtBody);
  grid.appendChild(evtPanel);

  frag.appendChild(grid);

  // Active trips panel
  const activeTrips = getTrips().filter(t => t.status === "en_route" || t.status === "at_stop" || t.status === "departed");
  if (activeTrips.length > 0) {
    const tripsPanel = document.createElement("div");
    tripsPanel.className = "ap3x-panel";
    tripsPanel.innerHTML = `<div class="ap3x-panel__header"><div class="ap3x-panel__title">🗺️ Active Journeys</div></div>`;
    const tripsBody = document.createElement("div");
    tripsBody.className = "ap3x-panel__body";
    const tripList = document.createElement("div");
    tripList.className = "ap3x-trip-list";
    activeTrips.forEach(t => tripList.appendChild(_buildTripCard(t)));
    tripsBody.appendChild(tripList);
    tripsPanel.appendChild(tripsBody);
    frag.appendChild(tripsPanel);
  }

  return frag;
}

// ─────────────────────────────────────────────
// VIEW: FLEET MAP
// ─────────────────────────────────────────────

function _viewFleet() {
  const vehicles = getVehicles();
  const frag = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "ap3x-page-header";
  header.innerHTML = `
    <div>
      <div class="ap3x-page-title">🚌 Live Fleet Map</div>
      <div class="ap3x-page-sub">Simulated vehicle positions and status across all active routes</div>
    </div>
  `;
  frag.appendChild(header);

  // Map
  const mapWrap = document.createElement("div");
  mapWrap.className = "ap3x-panel";
  mapWrap.style.minHeight = "340px";
  mapWrap.appendChild(_buildFleetMap(true));
  frag.appendChild(mapWrap);

  // Status heatmap
  const heatPanel = document.createElement("div");
  heatPanel.className = "ap3x-panel";
  heatPanel.innerHTML = `<div class="ap3x-panel__header"><div class="ap3x-panel__title">📊 Fleet Status Heatmap</div></div>`;
  const heatBody = document.createElement("div");
  heatBody.className = "ap3x-panel__body";
  const summary = getFleetSummary();
  heatBody.innerHTML = `
    <div class="ap3x-heatmap">
      <div class="ap3x-heatmap__cell ap3x-heatmap__cell--active">
        <div class="ap3x-heatmap__num" style="color:var(--status-en-route)">${summary.en_route}</div>
        <div class="ap3x-heatmap__lbl">En Route</div>
      </div>
      <div class="ap3x-heatmap__cell ap3x-heatmap__cell--warn">
        <div class="ap3x-heatmap__num" style="color:var(--status-at-stop)">${summary.at_stop}</div>
        <div class="ap3x-heatmap__lbl">At Stop</div>
      </div>
      <div class="ap3x-heatmap__cell">
        <div class="ap3x-heatmap__num" style="color:var(--status-parked)">${summary.parked}</div>
        <div class="ap3x-heatmap__lbl">Parked</div>
      </div>
      <div class="ap3x-heatmap__cell ap3x-heatmap__cell--ok">
        <div class="ap3x-heatmap__num" style="color:var(--status-completed)">${summary.completed}</div>
        <div class="ap3x-heatmap__lbl">Completed</div>
      </div>
      <div class="ap3x-heatmap__cell">
        <div class="ap3x-heatmap__num" style="color:var(--status-maintenance)">${summary.maintenance}</div>
        <div class="ap3x-heatmap__lbl">Maintenance</div>
      </div>
      <div class="ap3x-heatmap__cell ap3x-heatmap__cell--active">
        <div class="ap3x-heatmap__num" style="color:var(--accent-blue)">${summary.total}</div>
        <div class="ap3x-heatmap__lbl">Total Fleet</div>
      </div>
    </div>
  `;
  heatPanel.appendChild(heatBody);
  frag.appendChild(heatPanel);

  // Vehicle detail list
  const vehiclePanel = document.createElement("div");
  vehiclePanel.className = "ap3x-panel";
  vehiclePanel.innerHTML = `<div class="ap3x-panel__header"><div class="ap3x-panel__title">🚐 Vehicle Details</div></div>`;
  const vBody = document.createElement("div");
  vBody.className = "ap3x-panel__body";
  const vList = document.createElement("div");
  vList.className = "ap3x-vehicle-list";
  vehicles.forEach(v => vList.appendChild(_buildVehicleCard(v)));
  vBody.appendChild(vList);
  vehiclePanel.appendChild(vBody);
  frag.appendChild(vehiclePanel);

  return frag;
}

// ─────────────────────────────────────────────
// VIEW: TRIPS
// ─────────────────────────────────────────────

function _viewTrips() {
  const trips = getTrips();
  const frag = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "ap3x-page-header";
  header.innerHTML = `
    <div>
      <div class="ap3x-page-title">🗺️ Trip Monitor</div>
      <div class="ap3x-page-sub">Route timelines and journey progression for all active trips</div>
    </div>
  `;
  frag.appendChild(header);

  if (trips.length === 0) {
    const empty = document.createElement("div");
    empty.className = "ap3x-empty";
    empty.innerHTML = `<div class="ap3x-empty__icon">🗺️</div><div class="ap3x-empty__title">No trips loaded</div><div class="ap3x-empty__sub">Start the simulation to generate journeys.</div>`;
    frag.appendChild(empty);
    return frag;
  }

  const grid = document.createElement("div");
  grid.className = "ap3x-grid-2";

  trips.forEach(trip => {
    const panel = document.createElement("div");
    panel.className = "ap3x-panel";
    
    const hdr = document.createElement("div");
    hdr.className = "ap3x-panel__header";
    hdr.innerHTML = `
      <div class="ap3x-panel__title">${trip.vehicle_name}</div>
      <span class="ap3x-badge ap3x-badge--${trip.status}">${_statusLabel(trip.status)}</span>
    `;
    panel.appendChild(hdr);

    const body = document.createElement("div");
    body.className = "ap3x-panel__body";

    // Route info
    body.innerHTML = `
      <div style="font-size:var(--t-sm);color:var(--text-secondary);margin-bottom:var(--sp-sm)">
        <strong>${trip.departure}</strong> → <strong>${trip.destination}</strong><br>
        <span style="color:var(--text-muted)">${trip.route_name}</span><br>
        <span style="color:var(--text-muted)">Travellers: ${trip.traveller_name}</span>
      </div>
    `;

    // Progress bar
    const progDiv = document.createElement("div");
    progDiv.className = "ap3x-progress";
    progDiv.innerHTML = `
      <div class="ap3x-progress__header">
        <span>Journey Progress</span><span>${trip.progress_pct}%</span>
      </div>
      <div class="ap3x-progress__track">
        <div class="ap3x-progress__fill" style="width:${trip.progress_pct}%"></div>
      </div>
    `;
    body.appendChild(progDiv);

    // Timeline
    const tlDiv = document.createElement("div");
    tlDiv.style.marginTop = "var(--sp-md)";
    tlDiv.innerHTML = `<div style="font-size:var(--t-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:var(--sp-sm)">Route Stops</div>`;
    const tl = document.createElement("div");
    tl.className = "ap3x-timeline";

    const allStops = [trip.departure, ...trip.stops, trip.destination];
    allStops.forEach((stop, i) => {
      const isDone    = i < trip.current_stop_index + (trip.status === "completed" ? allStops.length : 0);
      const isCurrent = i === trip.current_stop_index && trip.status !== "completed";
      const isFuture  = !isDone && !isCurrent;

      const item = document.createElement("div");
      item.className = "ap3x-timeline__item";
      item.innerHTML = `
        <div class="ap3x-timeline__line-col">
          <div class="ap3x-timeline__dot ap3x-timeline__dot--${isDone ? "done" : isCurrent ? "current" : "future"}"></div>
          ${i < allStops.length - 1 ? `<div class="ap3x-timeline__connector ap3x-timeline__connector--${isDone ? "done" : ""}"></div>` : ""}
        </div>
        <div class="ap3x-timeline__content">
          <div class="ap3x-timeline__label ap3x-timeline__label--${isDone ? "done" : isCurrent ? "current" : ""}">${stop}</div>
          <div class="ap3x-timeline__sub">${i === 0 ? "Departure" : i === allStops.length - 1 ? "Destination" : `Stop ${i}`}</div>
        </div>
      `;
      tl.appendChild(item);
    });

    tlDiv.appendChild(tl);
    body.appendChild(tlDiv);

    if (trip.notes) {
      const notes = document.createElement("div");
      notes.style.cssText = "margin-top:var(--sp-md);padding:var(--sp-sm) var(--sp-md);background:var(--bg-surface);border-radius:var(--r-md);font-size:var(--t-sm);color:var(--text-secondary);border-left:3px solid var(--accent-blue)";
      notes.textContent = trip.notes;
      body.appendChild(notes);
    }

    panel.appendChild(body);
    grid.appendChild(panel);
  });

  frag.appendChild(grid);
  return frag;
}

// ─────────────────────────────────────────────
// VIEW: ALLOCATION
// ─────────────────────────────────────────────

function _viewAllocation() {
  const trips = getTrips();
  const vehicles = getVehicles();
  const frag = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "ap3x-page-header";
  header.innerHTML = `
    <div>
      <div class="ap3x-page-title">📋 Vehicle Allocation Panel</div>
      <div class="ap3x-page-sub">Current booking and vehicle assignment overview</div>
    </div>
  `;
  frag.appendChild(header);

  const panel = document.createElement("div");
  panel.className = "ap3x-panel";
  panel.innerHTML = `<div class="ap3x-panel__header"><div class="ap3x-panel__title">🚌 Fleet Allocation Table</div></div>`;

  const body = document.createElement("div");
  body.className = "ap3x-panel__body";
  body.style.overflowX = "auto";

  const table = document.createElement("table");
  table.className = "ap3x-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Vehicle</th>
        <th>Type</th>
        <th>Status</th>
        <th>Assigned Trip</th>
        <th>Travellers</th>
        <th>Progress</th>
        <th>Fuel</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");
  vehicles.forEach(v => {
    const trip = trips.find(t => t.vehicle_id === v.vehicle_id && t.status !== "completed");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${v.image_tag} ${v.name}</strong></td>
      <td style="color:var(--text-muted)">${v.type}</td>
      <td><span class="ap3x-badge ap3x-badge--${v.status}">${_statusLabel(v.status)}</span></td>
      <td style="color:var(--text-secondary)">${trip ? trip.route_name : "—"}</td>
      <td style="color:var(--text-secondary)">${trip ? trip.traveller_name : "—"}</td>
      <td>
        ${trip ? `
          <div style="display:flex;align-items:center;gap:6px;min-width:100px">
            <div style="flex:1;height:4px;background:var(--border);border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${trip.progress_pct}%;background:var(--accent-blue);border-radius:2px"></div>
            </div>
            <span style="font-size:var(--t-xs);color:var(--text-muted)">${trip.progress_pct}%</span>
          </div>` : '<span style="color:var(--text-muted)">—</span>'}
      </td>
      <td>
        <div class="ap3x-fuel-bar" style="min-width:80px">
          <div class="ap3x-fuel-bar__track">
            <div class="ap3x-fuel-bar__fill ap3x-fuel-bar__fill--${v.fuel_level < 30 ? "low" : v.fuel_level < 60 ? "medium" : ""}" style="width:${v.fuel_level}%"></div>
          </div>
          <span style="font-size:var(--t-xs);color:var(--text-muted);min-width:28px">${v.fuel_level}%</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  body.appendChild(table);
  panel.appendChild(body);
  frag.appendChild(panel);

  return frag;
}

// ─────────────────────────────────────────────
// VIEW: EVENTS
// ─────────────────────────────────────────────

function _viewEvents() {
  const events = getEventStream();
  const frag = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "ap3x-page-header";
  header.innerHTML = `
    <div>
      <div class="ap3x-page-title">📡 Live Event Stream</div>
      <div class="ap3x-page-sub">Real-time trip events across all active journeys</div>
    </div>
  `;
  frag.appendChild(header);

  const panel = document.createElement("div");
  panel.className = "ap3x-panel";
  panel.innerHTML = `<div class="ap3x-panel__header"><div class="ap3x-panel__title">📡 All Events (${events.length})</div></div>`;
  const body = document.createElement("div");
  body.className = "ap3x-panel__body--scroll";
  body.style.maxHeight = "calc(100vh - 220px)";

  if (events.length === 0) {
    body.innerHTML = `<div class="ap3x-empty"><div class="ap3x-empty__icon">📡</div><div class="ap3x-empty__title">No events yet</div><div class="ap3x-empty__sub">Start the simulation to see live events.</div></div>`;
  } else {
    const list = document.createElement("div");
    list.className = "ap3x-event-list";
    events.forEach(evt => list.appendChild(_buildEventItem(evt)));
    body.appendChild(list);
  }

  panel.appendChild(body);
  frag.appendChild(panel);
  return frag;
}

// ─────────────────────────────────────────────
// VIEW: AI INSIGHTS
// ─────────────────────────────────────────────

function _viewAI() {
  const messages = getAIMessages();
  const frag = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "ap3x-page-header";
  header.innerHTML = `
    <div>
      <div class="ap3x-page-title">🤖 AP3X Travel Intelligence</div>
      <div class="ap3x-page-sub">AI-assisted journey planning and route optimisation — simulation context only</div>
    </div>
  `;

  // Quick insight buttons
  const quickRow = document.createElement("div");
  quickRow.className = "ap3x-btn-row";
  quickRow.style.marginTop = "var(--sp-md)";
  [
    { label: "📊 Fleet Summary", query: "fleet status" },
    { label: "🗺️ Active Trips", query: "active trips status" },
    { label: "⛽ Fuel Tips", query: "fuel planning" },
    { label: "🏕️ Campsite Advice", query: "campsite booking" }
  ].forEach(({ label, query }) => {
    const btn = document.createElement("button");
    btn.className = "ap3x-btn ap3x-btn--secondary";
    btn.textContent = label;
    btn.addEventListener("click", () => _sendAIMessage(query));
    quickRow.appendChild(btn);
  });
  header.appendChild(quickRow);
  frag.appendChild(header);

  // Chat panel
  const panel = document.createElement("div");
  panel.className = "ap3x-panel ap3x-ai-panel";

  const msgs = document.createElement("div");
  msgs.className = "ap3x-ai-messages";

  if (messages.length === 0) {
    const welcome = document.createElement("div");
    welcome.className = "ap3x-ai-msg ap3x-ai-msg--assistant";
    welcome.innerHTML = `
      <div>Welcome to <strong>AP3X Travel Intelligence</strong>. I can help with route insights, fleet summaries, trip status, fuel planning, campsite recommendations, and journey optimisation.</div>
      <div class="ap3x-ai-msg__time">Ready</div>
    `;
    msgs.appendChild(welcome);
  } else {
    messages.forEach(m => {
      const msgEl = document.createElement("div");
      msgEl.className = `ap3x-ai-msg ap3x-ai-msg--${m.role}`;
      msgEl.innerHTML = `
        <div>${m.text}</div>
        <div class="ap3x-ai-msg__time">${new Date(m.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
      `;
      msgs.appendChild(msgEl);
    });
  }

  panel.appendChild(msgs);

  // Input
  const inputRow = document.createElement("div");
  inputRow.className = "ap3x-ai-input";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ask about routes, fleet status, fuel, campsites…";
  const sendBtn = document.createElement("button");
  sendBtn.className = "ap3x-btn ap3x-btn--primary";
  sendBtn.textContent = "Ask";

  const doSend = () => {
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    _sendAIMessage(q);
  };

  sendBtn.addEventListener("click", doSend);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSend(); });

  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);
  panel.appendChild(inputRow);

  frag.appendChild(panel);
  return frag;
}

// ─────────────────────────────────────────────
// AI MESSAGE HANDLER
// ─────────────────────────────────────────────

function _sendAIMessage(query) {
  pushAIMessage("user", query);
  setTimeout(() => {
    const response = answerTravelQuery(query);
    pushAIMessage("assistant", response);
  }, 600);
}

// ─────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────

function _buildFleetMap(tall = false) {
  const vehicles = getVehicles();
  const trips    = getTrips();

  // ── coordinate lookup for known locations ───────────────────────
  const COORDS = {
    "San Francisco, CA":  [37.7749, -122.4194],
    "Santa Cruz":         [36.9741, -122.0308],
    "Big Sur":            [36.2704, -121.8081],
    "San Simeon":         [35.6425, -121.1896],
    "Morro Bay":          [35.3658, -120.8499],
    "San Luis Obispo":    [35.2828, -120.6596],
    "Los Angeles, CA":    [34.0522, -118.2437],
    "Denver, CO":         [39.7392, -104.9903],
    "Estes Park":         [40.3772, -105.5217],
    "Grand Lake":         [40.2525, -105.8228],
    "Glenwood Springs":   [39.5505, -107.3248],
    "Aspen":              [39.1911, -106.8175],
    "Breckenridge":       [39.4817, -106.0384],
    "Nashville, TN":      [36.1627, -86.7816],
    "Memphis":            [35.1495, -90.0490],
    "Tupelo":             [34.2576, -88.7034],
    "Birmingham":         [33.5186, -86.8104],
    "Montgomery":         [32.3668, -86.2999],
    "Mobile":             [30.6954, -88.0399],
    "New Orleans, LA":    [29.9511, -90.0715],
    "Boston, MA":         [42.3601, -71.0589],
    "Concord NH":         [43.2081, -71.5376],
    "North Conway":       [43.9709, -71.1270],
    "Stowe":              [44.4654, -72.6874],
    "Montpelier":         [44.2601, -72.5754],
    "Burlington, VT":     [44.4759, -73.2121]
  };

  function interpCoord(trip) {
    const pct   = (trip.progress_pct || 0) / 100;
    const stops = trip.stops || [];
    const dep   = COORDS[trip.departure]   || [39.5, -98.35];
    const dest  = COORDS[trip.destination] || [39.5, -98.35];

    // build full waypoint list
    const wps = [dep, ...stops.map(s => COORDS[s] || null).filter(Boolean), dest];
    if (wps.length < 2) return dep;

    const seg = 1 / (wps.length - 1);
    const segIdx = Math.min(Math.floor(pct / seg), wps.length - 2);
    const segPct = (pct - segIdx * seg) / seg;
    const a = wps[segIdx], b = wps[segIdx + 1];
    return [
      a[0] + (b[0] - a[0]) * segPct,
      a[1] + (b[1] - a[1]) * segPct
    ];
  }

  // ── wrapper ───────────────────────────────────────────────────────
  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  wrap.style.borderRadius = "12px";
  wrap.style.overflow = "hidden";
  wrap.style.border = "1px solid var(--border)";

  const mapEl = document.createElement("div");
  const mapId = "ap3x-leaflet-" + Date.now();
  mapEl.id = mapId;
  mapEl.style.width = "100%";
  mapEl.style.height = tall ? "360px" : "260px";
  mapEl.style.background = "#060a14";
  wrap.appendChild(mapEl);

  // ── legend ────────────────────────────────────────────────────────
  const legend = document.createElement("div");
  legend.className = "ap3x-map__legend";
  [
    { color: "var(--status-en-route)", label: "En Route" },
    { color: "var(--status-at-stop)",  label: "At Stop"  },
    { color: "var(--status-parked)",   label: "Parked"   }
  ].forEach(({ color, label }) => {
    const chip = document.createElement("span");
    chip.className = "ap3x-badge";
    chip.style.background  = "var(--bg-overlay)";
    chip.style.border      = `1px solid ${color}`;
    chip.style.color       = color;
    chip.textContent       = label;
    legend.appendChild(chip);
  });
  wrap.appendChild(legend);

  // ── init Leaflet after element is in DOM ─────────────────────────
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!window.L) return;

      const L = window.L;
      const lmap = L.map(mapId, {
        center: [39.5, -98.35],
        zoom:   4,
        zoomControl: true,
        attributionControl: true
      });

      // Dark OSM tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18
      }).addTo(lmap);

      // Status → colour
      const STATUS_COLOR = {
        en_route:    "#3b82f6",
        at_stop:     "#f59e0b",
        parked:      "#6b7280",
        maintenance: "#ef4444",
        completed:   "#10b981"
      };

      const markers = [];

      vehicles.forEach(v => {
        // find active trip for this vehicle
        const trip = trips.find(t => t.vehicle_id === v.vehicle_id && 
          ["en_route","at_stop","scheduled","departed","delayed"].includes(t.status));

        let coord;
        if (trip) {
          coord = interpCoord(trip);
        } else {
          // parked/maintenance — use departure of last trip or rough default
          const lastTrip = [...trips].reverse().find(t => t.vehicle_id === v.vehicle_id);
          coord = lastTrip ? (COORDS[lastTrip.departure] || [39.5, -98.35]) : [39.5, -98.35];
          // spread parked vehicles slightly so they don't stack
          coord = [coord[0] + (Math.random() - 0.5) * 2, coord[1] + (Math.random() - 0.5) * 3];
        }

        const color = STATUS_COLOR[v.status] || "#6b7280";

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            background:${color};
            border:2px solid #fff;
            border-radius:50%;
            width:32px;height:32px;
            display:flex;align-items:center;justify-content:center;
            font-size:16px;
            box-shadow:0 2px 8px rgba(0,0,0,0.6);
            cursor:pointer;
          ">${v.image_tag}</div>
          <div style="
            color:#fff;font-size:10px;font-weight:600;
            text-align:center;margin-top:2px;
            text-shadow:0 1px 3px rgba(0,0,0,0.9);
            white-space:nowrap;
          ">${v.name}</div>`,
          iconSize:   [64, 48],
          iconAnchor: [32, 16]
        });

        const marker = L.marker(coord, { icon }).addTo(lmap);
        marker.bindPopup(`
          <b>${v.image_tag} ${v.name}</b><br>
          ${v.type} · ${v.year}<br>
          Status: <b>${v.status.replace("_"," ")}</b><br>
          Fuel: ${v.fuel_level}%<br>
          ${trip ? `Route: ${trip.route_name}<br>Progress: ${trip.progress_pct}%` : ""}
        `);
        markers.push(marker);
      });

      // Store map ref so simulation updates can refresh markers
      mapEl._leafletMap = lmap;
      mapEl._leafletMarkers = markers;
    });
  });

  return wrap;
}

function _buildVehicleCard(v) {
  const card = document.createElement("div");
  card.className = "ap3x-vehicle-card";
  card.innerHTML = `
    <div class="ap3x-vehicle-card__icon">${v.image_tag}</div>
    <div class="ap3x-vehicle-card__info">
      <div class="ap3x-vehicle-card__name">${v.name}</div>
      <div class="ap3x-vehicle-card__type">${v.type} · ${v.year} · Cap: ${v.capacity}</div>
      <div class="ap3x-fuel-bar" style="margin-top:4px">
        <span style="font-size:var(--t-xs);color:var(--text-muted)">⛽</span>
        <div class="ap3x-fuel-bar__track">
          <div class="ap3x-fuel-bar__fill ap3x-fuel-bar__fill--${v.fuel_level < 30 ? "low" : v.fuel_level < 60 ? "medium" : ""}" style="width:${v.fuel_level}%"></div>
        </div>
        <span style="font-size:var(--t-xs);color:var(--text-muted)">${v.fuel_level}%</span>
      </div>
    </div>
    <div class="ap3x-vehicle-card__status-col">
      <span class="ap3x-badge ap3x-badge--${v.status}">${_statusLabel(v.status)}</span>
    </div>
  `;
  return card;
}

function _buildTripCard(t) {
  const card = document.createElement("div");
  card.className = "ap3x-trip-card";
  card.innerHTML = `
    <div class="ap3x-trip-card__header">
      <div>
        <div class="ap3x-trip-card__name">${t.vehicle_name}</div>
        <div class="ap3x-trip-card__route">${t.route_name} · ${t.traveller_name}</div>
      </div>
      <span class="ap3x-badge ap3x-badge--${t.status}">${_statusLabel(t.status)}</span>
    </div>
    <div class="ap3x-progress">
      <div class="ap3x-progress__header"><span>${t.departure} → ${t.destination}</span><span>${t.progress_pct}%</span></div>
      <div class="ap3x-progress__track"><div class="ap3x-progress__fill" style="width:${t.progress_pct}%"></div></div>
    </div>
  `;
  card.addEventListener("click", () => { setActiveTrip(t.trip_id); navigate("trips"); });
  return card;
}

function _buildEventItem(evt) {
  const item = document.createElement("div");
  const typeClass = (evt.type || "").replace(/_/g, "_");
  item.className = `ap3x-event-item ap3x-event-item--${typeClass}`;
  const msg = evt.payload?.message || evt.type;
  const time = new Date(evt.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  item.innerHTML = `
    <div class="ap3x-event-item__msg">${msg}</div>
    <div class="ap3x-event-item__time">${time}</div>
  `;
  return item;
}

function _statusLabel(status) {
  const map = {
    parked: "Parked", en_route: "En Route", at_stop: "At Stop",
    maintenance: "Maintenance", completed: "Completed",
    scheduled: "Scheduled", delayed: "Delayed", departed: "Departed"
  };
  return map[status] || status;
}

function _disclaimer() {
  const d = document.createElement("div");
  d.className = "ap3x-disclaimer";
  d.textContent = "AP3X Motorhome & RV Intelligent Travel Management Simulation OS — For simulation and demonstration purposes only. Not real-world vehicle control software.";
  return d;
}
