// AP3X — RV Traveller & Driver Interface (PWA)
// Mobile-first trip companion for travellers
// Architecture preserved from NDOS dashboard pattern

import { getTrips, getActiveTrip, setActiveTrip, onTripsChange, TRIP_STATUS } from "../../ap3x/core/trips.js";
import { getVehicles, onVehiclesChange } from "../../ap3x/core/vehicles.js";
import { getAIMessages, pushAIMessage, onAIMessagesChange, answerTravelQuery, generateNextStopRecommendation, generateTripInsight } from "../../ap3x/engine/ai-assistant.js";
import { storage, AP3X_KEYS } from "../../ap3x/core/storage.js";

// ─────────────────────────────────────────────
// CHECKLIST STATE
// ─────────────────────────────────────────────

const DEFAULT_CHECKLIST = [
  { id: "cl-1", text: "Confirm vehicle pre-check complete",    note: "Tyres, lights, water, waste tanks", done: false },
  { id: "cl-2", text: "Review today's route stops",            note: "Check itinerary and timing",         done: false },
  { id: "cl-3", text: "Fuel level adequate for next leg",      note: "Minimum 40% recommended",           done: false },
  { id: "cl-4", text: "Campsite reservation confirmed",        note: "Check-in details saved",            done: false },
  { id: "cl-5", text: "Provisions stocked for next segment",   note: "Water, food, supplies",             done: false },
  { id: "cl-6", text: "Emergency kit accessible",              note: "First aid, torch, power bank",      done: false },
  { id: "cl-7", text: "Weather checked for route segment",     note: "Mountain/coastal alerts reviewed",  done: false },
  { id: "cl-8", text: "Slide-outs and awning retracted",       note: "Pre-departure exterior check",      done: false }
];

function getChecklist() {
  return storage.get("ap3x_traveller_checklist") || DEFAULT_CHECKLIST;
}
function toggleChecklistItem(id) {
  storage.update("ap3x_traveller_checklist", (list) => {
    const l = list || DEFAULT_CHECKLIST;
    return l.map(item => item.id === id ? { ...item, done: !item.done } : item);
  });
}
function resetChecklist() {
  storage.set("ap3x_traveller_checklist", DEFAULT_CHECKLIST);
}
function onChecklistChange(cb) {
  return storage.subscribe("ap3x_traveller_checklist", cb);
}

// ─────────────────────────────────────────────
// MOUNT + STATE
// ─────────────────────────────────────────────

let _mountEl = null;
let _view = "trip"; // trip | itinerary | checklist | ai

export function mountTraveller(el) {
  if (!el) throw new Error("[AP3X PWA] Mount element not found.");
  _mountEl = el;
  _render();

  onTripsChange(() => _render());
  onVehiclesChange(() => _render());
  onAIMessagesChange(() => _render());
  onChecklistChange(() => _render());
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
  _mountEl.className = "pwa-app pwa-fade-in";
  _mountEl.appendChild(_topBar());

  const main = document.createElement("main");
  main.className = "pwa-main";

  switch (_view) {
    case "trip":      main.appendChild(_viewTripOverview()); break;
    case "itinerary": main.appendChild(_viewItinerary()); break;
    case "checklist": main.appendChild(_viewChecklist()); break;
    case "ai":        main.appendChild(_viewAI()); break;
    default:          main.appendChild(_viewTripOverview());
  }

  main.appendChild(_disclaimer());
  _mountEl.appendChild(main);
  _mountEl.appendChild(_bottomNav());
}

// ─────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────

function _topBar() {
  const trip = getActiveTrip();
  const bar = document.createElement("header");
  bar.className = "pwa-topbar";
  bar.innerHTML = `
    <div class="pwa-topbar__logo">
      <div class="pwa-topbar__dot"></div>
      AP3X
      <span class="pwa-topbar__badge">Traveller</span>
    </div>
    <div style="font-size:var(--t-xs);color:var(--text-muted)">
      ${trip ? `🚐 ${trip.vehicle_name}` : "No active trip"}
    </div>
  `;
  return bar;
}

// ─────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────

function _bottomNav() {
  const tabs = [
    { id: "trip",      icon: "🏠", label: "Trip" },
    { id: "itinerary", icon: "🗺️",  label: "Route" },
    { id: "checklist", icon: "✅", label: "Checklist" },
    { id: "ai",        icon: "🤖", label: "Assistant" }
  ];

  const nav = document.createElement("nav");
  nav.className = "pwa-bottom-nav";

  tabs.forEach(({ id, icon, label }) => {
    const btn = document.createElement("button");
    btn.className = `pwa-nav-tab${_view === id ? " active" : ""}`;
    btn.innerHTML = `<span class="pwa-nav-tab__icon">${icon}</span>${label}`;
    btn.addEventListener("click", () => navigate(id));
    nav.appendChild(btn);
  });

  return nav;
}

// ─────────────────────────────────────────────
// VIEW: TRIP OVERVIEW
// ─────────────────────────────────────────────

function _viewTripOverview() {
  const trip = getActiveTrip();
  const frag = document.createDocumentFragment();

  if (!trip) {
    const trips = getTrips();
    const header = document.createElement("div");
    header.className = "pwa-section-header";
    header.innerHTML = `<div class="pwa-section-title">🚐 Select Your Trip</div>`;
    frag.appendChild(header);

    if (trips.length === 0) {
      const empty = document.createElement("div");
      empty.className = "pwa-empty";
      empty.innerHTML = `<div class="pwa-empty__icon">🗺️</div><div class="pwa-empty__title">No trips found</div><div class="pwa-empty__sub">Start the simulation in the Command OS to generate journeys.</div>`;
      frag.appendChild(empty);
    } else {
      trips.forEach(t => {
        const card = document.createElement("div");
        card.className = "pwa-card";
        card.style.cursor = "pointer";
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-size:var(--t-base);font-weight:700;color:var(--text-primary)">${t.vehicle_name}</div>
              <div style="font-size:var(--t-sm);color:var(--text-secondary);margin-top:2px">${t.route_name}</div>
              <div style="font-size:var(--t-xs);color:var(--text-muted)">${t.traveller_name}</div>
            </div>
            <span class="pwa-badge pwa-badge--${t.status === "en_route" ? "blue" : t.status === "at_stop" ? "amber" : "green"}">${_statusLabel(t.status)}</span>
          </div>
          <div style="margin-top:var(--sp-md)">
            <div style="display:flex;justify-content:space-between;font-size:var(--t-xs);color:var(--text-muted);margin-bottom:5px">
              <span>${t.departure}</span><span>${t.destination}</span>
            </div>
            <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${t.progress_pct}%;background:var(--accent-blue);border-radius:3px"></div>
            </div>
          </div>
        `;
        card.addEventListener("click", () => { setActiveTrip(t.trip_id); _render(); });
        frag.appendChild(card);
      });
    }
    return frag;
  }

  // Active trip hero card
  const hero = document.createElement("div");
  hero.className = "pwa-trip-hero";
  hero.innerHTML = `
    <div class="pwa-trip-hero__badge pwa-trip-hero__badge--${trip.status}">
      ${_statusEmoji(trip.status)} ${_statusLabel(trip.status)}
    </div>
    <div class="pwa-trip-hero__vehicle">${trip.vehicle_name}</div>
    <div class="pwa-trip-hero__route">${trip.route_name} · ${trip.traveller_name}</div>
    <div class="pwa-trip-hero__route-arrow">
      ${trip.departure} <span>→</span> ${trip.destination}
    </div>
    <div class="pwa-progress">
      <div class="pwa-progress__row">
        <span>Journey Progress</span>
        <span style="font-weight:600;color:var(--accent-blue-2)">${trip.progress_pct}%</span>
      </div>
      <div class="pwa-progress__track">
        <div class="pwa-progress__fill" style="width:${trip.progress_pct}%"></div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:var(--sp-sm);font-size:var(--t-xs);color:var(--text-muted)">
      <span>Stop ${trip.current_stop_index + 1} / ${trip.stops.length + 2}</span>
      <span>Remaining: ${trip.stops.length - trip.current_stop_index} stops</span>
    </div>
  `;
  frag.appendChild(hero);

  // Next Stop card
  const nextStop = trip.stops[trip.current_stop_index] || trip.destination;
  const nextCard = document.createElement("div");
  nextCard.className = "pwa-next-stop";
  nextCard.innerHTML = `
    <div class="pwa-next-stop__label">📍 Next Stop</div>
    <div class="pwa-next-stop__name">${nextStop}</div>
    <div class="pwa-next-stop__sub">${generateNextStopRecommendation(trip.trip_id)}</div>
    <div class="pwa-next-stop__eta">⏱ Simulated ETA: ${_formatETA(trip.eta)}</div>
  `;
  frag.appendChild(nextCard);

  // Notes
  if (trip.notes) {
    const notes = document.createElement("div");
    notes.className = "pwa-card";
    notes.style.borderLeft = "3px solid var(--accent-blue)";
    notes.style.fontSize = "var(--t-sm)";
    notes.style.color = "var(--text-secondary)";
    notes.innerHTML = `<div style="font-size:var(--t-xs);text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:4px">Latest Update</div>${trip.notes}`;
    frag.appendChild(notes);
  }

  // Switch trip button
  const changeBtn = document.createElement("button");
  changeBtn.className = "pwa-btn pwa-btn--secondary pwa-btn--full";
  changeBtn.textContent = "Switch Trip";
  changeBtn.addEventListener("click", () => { storage.delete(AP3X_KEYS.ACTIVE_TRIP); _render(); });
  frag.appendChild(changeBtn);

  return frag;
}

// ─────────────────────────────────────────────
// VIEW: ITINERARY
// ─────────────────────────────────────────────

function _viewItinerary() {
  const trip = getActiveTrip();
  const frag = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "pwa-section-header";
  header.innerHTML = `<div><div class="pwa-section-title">🗺️ Route Itinerary</div>${trip ? `<div class="pwa-section-sub">${trip.route_name}</div>` : ""}</div>`;
  frag.appendChild(header);

  if (!trip) {
    const empty = document.createElement("div");
    empty.className = "pwa-empty";
    empty.innerHTML = `<div class="pwa-empty__icon">🗺️</div><div class="pwa-empty__title">No active trip</div><div class="pwa-empty__sub">Select a trip from the Trip tab.</div>`;
    frag.appendChild(empty);
    return frag;
  }

  const card = document.createElement("div");
  card.className = "pwa-card";

  const allStops = [
    { name: trip.departure, type: "Departure Point", idx: -1 },
    ...trip.stops.map((s, i) => ({ name: s, type: `Stop ${i + 1}`, idx: i })),
    { name: trip.destination, type: "Final Destination", idx: trip.stops.length }
  ];

  const tl = document.createElement("div");
  tl.className = "pwa-itinerary";

  allStops.forEach((stop, i) => {
    const isDone    = stop.idx >= 0 && stop.idx < trip.current_stop_index;
    const isCurrent = stop.idx === trip.current_stop_index && trip.status !== "completed";
    const isLast    = i === allStops.length - 1;

    const item = document.createElement("div");
    item.className = "pwa-stop-item";
    item.innerHTML = `
      <div class="pwa-stop-item__line">
        <div class="pwa-stop-item__dot pwa-stop-item__dot--${isDone ? "done" : isCurrent ? "current" : "future"}"></div>
        ${!isLast ? `<div class="pwa-stop-item__connector pwa-stop-item__connector--${isDone ? "done" : ""}"></div>` : ""}
      </div>
      <div class="pwa-stop-item__content">
        <div class="pwa-stop-item__name pwa-stop-item__name--${isDone ? "done" : isCurrent ? "current" : ""}">${stop.name}</div>
        <div class="pwa-stop-item__sub">${stop.type}${isCurrent ? " · Current Position" : ""}${isDone ? " · Completed" : ""}</div>
      </div>
    `;
    tl.appendChild(item);
  });

  card.appendChild(tl);
  frag.appendChild(card);

  // Info grid
  const info = document.createElement("div");
  info.className = "pwa-card";
  info.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-md)">
      <div>
        <div style="font-size:var(--t-xs);color:var(--text-muted);margin-bottom:2px">Total Stops</div>
        <div style="font-size:var(--t-lg);font-weight:700;color:var(--text-primary)">${trip.stops.length}</div>
      </div>
      <div>
        <div style="font-size:var(--t-xs);color:var(--text-muted);margin-bottom:2px">Completed</div>
        <div style="font-size:var(--t-lg);font-weight:700;color:var(--accent-green)">${trip.current_stop_index}</div>
      </div>
      <div>
        <div style="font-size:var(--t-xs);color:var(--text-muted);margin-bottom:2px">Progress</div>
        <div style="font-size:var(--t-lg);font-weight:700;color:var(--accent-blue)">${trip.progress_pct}%</div>
      </div>
      <div>
        <div style="font-size:var(--t-xs);color:var(--text-muted);margin-bottom:2px">Status</div>
        <div style="font-size:var(--t-base);font-weight:600;color:var(--text-primary)">${_statusLabel(trip.status)}</div>
      </div>
    </div>
  `;
  frag.appendChild(info);

  return frag;
}

// ─────────────────────────────────────────────
// VIEW: CHECKLIST
// ─────────────────────────────────────────────

function _viewChecklist() {
  const checklist = getChecklist();
  const done = checklist.filter(i => i.done).length;
  const frag = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "pwa-section-header";
  header.innerHTML = `
    <div>
      <div class="pwa-section-title">✅ Travel Checklist</div>
      <div class="pwa-section-sub">${done}/${checklist.length} complete</div>
    </div>
  `;
  const resetBtn = document.createElement("button");
  resetBtn.className = "pwa-btn pwa-btn--secondary";
  resetBtn.style.fontSize = "var(--t-xs)";
  resetBtn.textContent = "↺ Reset";
  resetBtn.addEventListener("click", resetChecklist);
  header.appendChild(resetBtn);
  frag.appendChild(header);

  // Progress bar
  const pct = Math.round((done / checklist.length) * 100);
  const progWrap = document.createElement("div");
  progWrap.innerHTML = `
    <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:var(--sp-sm)">
      <div style="height:100%;width:${pct}%;background:var(--accent-green);border-radius:3px;transition:width 0.4s ease"></div>
    </div>
  `;
  frag.appendChild(progWrap);

  const list = document.createElement("div");
  list.className = "pwa-checklist";

  checklist.forEach(item => {
    const el = document.createElement("div");
    el.className = `pwa-checklist__item${item.done ? " done" : ""}`;
    el.innerHTML = `
      <div class="pwa-checklist__checkbox">${item.done ? "✓" : ""}</div>
      <div>
        <div class="pwa-checklist__text">${item.text}</div>
        <div class="pwa-checklist__note">${item.note}</div>
      </div>
    `;
    el.addEventListener("click", () => toggleChecklistItem(item.id));
    list.appendChild(el);
  });

  frag.appendChild(list);

  if (done === checklist.length) {
    const doneMsg = document.createElement("div");
    doneMsg.className = "pwa-card";
    doneMsg.style.textAlign = "center";
    doneMsg.style.borderColor = "var(--accent-green)";
    doneMsg.innerHTML = `
      <div style="font-size:2rem;margin-bottom:var(--sp-sm)">🎉</div>
      <div style="font-size:var(--t-base);font-weight:700;color:var(--accent-green)">All checks complete!</div>
      <div style="font-size:var(--t-sm);color:var(--text-muted);margin-top:4px">You're ready to hit the road.</div>
    `;
    frag.appendChild(doneMsg);
  }

  return frag;
}

// ─────────────────────────────────────────────
// VIEW: AI ASSISTANT
// ─────────────────────────────────────────────

function _viewAI() {
  const messages = getAIMessages();
  const trip = getActiveTrip();
  const frag = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "pwa-section-header";
  header.innerHTML = `
    <div>
      <div class="pwa-section-title">🤖 Travel Assistant</div>
      <div class="pwa-section-sub">AP3X Travel Intelligence — simulation only</div>
    </div>
  `;
  frag.appendChild(header);

  // Quick prompts
  const quickRow = document.createElement("div");
  quickRow.style.cssText = "display:flex;gap:var(--sp-sm);flex-wrap:wrap;margin-bottom:var(--sp-sm)";
  [
    { label: "Next stop?",    query: "next stop recommendation" },
    { label: "Route insight", query: "route insight for current trip" },
    { label: "Fuel check",    query: "fuel planning advice" },
    { label: "Trip status",   query: "current trip status" }
  ].forEach(({ label, query }) => {
    const btn = document.createElement("button");
    btn.className = "pwa-btn pwa-btn--secondary";
    btn.style.fontSize = "var(--t-xs)";
    btn.textContent = label;
    btn.addEventListener("click", () => _sendAIMessage(query));
    quickRow.appendChild(btn);
  });
  frag.appendChild(quickRow);

  // Chat panel
  const panel = document.createElement("div");
  panel.className = "pwa-ai-panel";

  const msgs = document.createElement("div");
  msgs.className = "pwa-ai-messages";

  if (messages.length === 0) {
    const welcome = document.createElement("div");
    welcome.className = "pwa-ai-msg pwa-ai-msg--assistant";
    welcome.innerHTML = `<div>Hi! I'm your AP3X Travel Assistant. Ask me about your route, next stops, fuel planning, campsites, or anything about your journey.</div><div class="pwa-ai-msg__time">Ready</div>`;
    msgs.appendChild(welcome);

    if (trip) {
      setTimeout(() => {
        pushAIMessage("assistant", generateTripInsight(trip.trip_id));
      }, 600);
    }
  } else {
    messages.forEach(m => {
      const el = document.createElement("div");
      el.className = `pwa-ai-msg pwa-ai-msg--${m.role}`;
      el.innerHTML = `<div>${m.text}</div><div class="pwa-ai-msg__time">${new Date(m.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>`;
      msgs.appendChild(el);
    });
  }

  panel.appendChild(msgs);

  const inputRow = document.createElement("div");
  inputRow.className = "pwa-ai-input";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ask about your journey…";
  const sendBtn = document.createElement("button");
  sendBtn.className = "pwa-btn pwa-btn--primary";
  sendBtn.textContent = "Send";

  const doSend = () => {
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    _sendAIMessage(q);
  };
  sendBtn.addEventListener("click", doSend);
  input.addEventListener("keydown", e => { if (e.key === "Enter") doSend(); });

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
    const trip = getActiveTrip();
    let response;
    if (query.includes("next stop") && trip) {
      response = generateNextStopRecommendation(trip.trip_id);
    } else if ((query.includes("route insight") || query.includes("trip status")) && trip) {
      response = generateTripInsight(trip.trip_id);
    } else {
      response = answerTravelQuery(query);
    }
    pushAIMessage("assistant", response);
  }, 600);
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function _statusLabel(s) {
  const map = { en_route:"En Route", at_stop:"At Stop", scheduled:"Scheduled", completed:"Completed", delayed:"Delayed", departed:"Departed", parked:"Parked" };
  return map[s] || s;
}
function _statusEmoji(s) {
  const map = { en_route:"🛣️", at_stop:"📍", scheduled:"🗓️", completed:"🏁", delayed:"⚠️", departed:"🚀" };
  return map[s] || "🚐";
}
function _formatETA(eta) {
  if (!eta) return "TBC";
  return new Date(eta).toLocaleDateString("en-GB", { weekday:"short", month:"short", day:"numeric" });
}
function _disclaimer() {
  const d = document.createElement("div");
  d.className = "pwa-disclaimer";
  d.textContent = "AP3X RV Traveller Interface — Simulation only. Not for real-world navigation use.";
  return d;
}
