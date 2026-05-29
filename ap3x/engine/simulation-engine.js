// AP3X — engine/simulation-engine.js
// Core Simulation Engine: Trip Generator, Vehicle State, Event Stream

import { storage, AP3X_KEYS, rawLog } from "../core/storage.js";
import { getVehicles, setVehicleStatus, VEHICLE_STATUS } from "../core/vehicles.js";
import { getTrips, updateTrip, TRIP_STATUS, ROUTE_TEMPLATES } from "../core/trips.js";

// ─────────────────────────────────────────────
// EVENT TYPES
// ─────────────────────────────────────────────

export const EVENT_TYPES = {
  TRIP_STARTED:    "TRIP_STARTED",
  STOP_REACHED:    "STOP_REACHED",
  TRIP_COMPLETED:  "TRIP_COMPLETED",
  DELAY_SIM:       "DELAY_SIMULATED",
  MAINTENANCE_EVT: "MAINTENANCE_EVENT",
  FUEL_UPDATE:     "FUEL_UPDATE",
  DEPARTURE:       "DEPARTURE"
};

// ─────────────────────────────────────────────
// EVENT STREAM
// ─────────────────────────────────────────────

export function pushEvent(type, payload) {
  storage.update(AP3X_KEYS.EVENTS, (events) => {
    const list = events || [];
    const evt = {
      event_id:  crypto.randomUUID(),
      type,
      payload,
      timestamp: new Date().toISOString()
    };
    const next = [evt, ...list];
    return next.slice(0, 100); // keep last 100 events
  });
  rawLog("SIM_EVENT", { type, payload });
}

export function getEventStream() {
  return storage.get(AP3X_KEYS.EVENTS) || [];
}

export function onEventsChange(callback) {
  return storage.subscribe(AP3X_KEYS.EVENTS, callback);
}

// ─────────────────────────────────────────────
// SIMULATION CONTROL
// ─────────────────────────────────────────────

let _simInterval = null;

export function isSimulationRunning() {
  return storage.get(AP3X_KEYS.SIM_RUNNING) === true;
}

export function startSimulation() {
  storage.set(AP3X_KEYS.SIM_RUNNING, true);
  pushEvent("SIM_STARTED", { message: "Trip simulation engine activated." });
  _runSimStep();
  _simInterval = setInterval(_runSimStep, 8000); // tick every 8s
}

export function pauseSimulation() {
  storage.set(AP3X_KEYS.SIM_RUNNING, false);
  if (_simInterval) clearInterval(_simInterval);
  _simInterval = null;
  pushEvent("SIM_PAUSED", { message: "Simulation paused." });
}

export function resetSimulation() {
  pauseSimulation();
  // Clear all state and re-seed
  storage.delete(AP3X_KEYS.TRIPS);
  storage.delete(AP3X_KEYS.VEHICLES);
  storage.delete(AP3X_KEYS.EVENTS);
  storage.delete(AP3X_KEYS.AI_MESSAGES);
  storage.delete(AP3X_KEYS.ACTIVE_TRIP);
  storage.set(AP3X_KEYS.SIM_RUNNING, false);
  pushEvent("SIM_RESET", { message: "All trip data reset. Ready for new simulation." });
}

// ─────────────────────────────────────────────
// SIMULATION TICK ENGINE
// ─────────────────────────────────────────────

function _runSimStep() {
  if (!isSimulationRunning()) return;

  const trips = getTrips();
  const vehicles = getVehicles();

  // Pick a random active trip to advance
  const activeTrips = trips.filter(t =>
    t.status === TRIP_STATUS.EN_ROUTE ||
    t.status === TRIP_STATUS.AT_STOP ||
    t.status === TRIP_STATUS.SCHEDULED
  );

  if (activeTrips.length === 0) {
    // All done — auto-generate new trip
    _generateNewTrip(vehicles);
    return;
  }

  const trip = activeTrips[Math.floor(Math.random() * activeTrips.length)];
  _advanceTripState(trip);
}

function _advanceTripState(trip) {
  const rand = Math.random();

  // ── Scheduled → Depart ──────────────────
  if (trip.status === TRIP_STATUS.SCHEDULED) {
    updateTrip(trip.trip_id, {
      status:      TRIP_STATUS.DEPARTED,
      departed_at: new Date().toISOString(),
      progress_pct: 5
    });
    setVehicleStatus(trip.vehicle_id, VEHICLE_STATUS.EN_ROUTE);
    pushEvent(EVENT_TYPES.TRIP_STARTED, {
      trip_id:      trip.trip_id,
      vehicle:      trip.vehicle_name,
      travellers:   trip.traveller_name,
      route:        trip.route_name,
      message:      `🚀 ${trip.vehicle_name} has departed ${trip.departure} — ${trip.route_name} underway!`
    });
    return;
  }

  // ── En Route → advance progress ─────────
  if (trip.status === TRIP_STATUS.EN_ROUTE || trip.status === TRIP_STATUS.DEPARTED) {
    const newProgress = Math.min(100, trip.progress_pct + Math.floor(Math.random() * 15) + 5);

    // Random delay event (10% chance)
    if (rand < 0.10) {
      const delays = [
        "Road construction ahead — slight detour added.",
        "Weather advisory: fog on coastal section.",
        "Travellers taking an unplanned scenic detour.",
        "Brief rest stop — back on the road shortly."
      ];
      const msg = delays[Math.floor(Math.random() * delays.length)];
      updateTrip(trip.trip_id, { status: TRIP_STATUS.DELAYED, notes: msg });
      pushEvent(EVENT_TYPES.DELAY_SIM, { trip_id: trip.trip_id, vehicle: trip.vehicle_name, message: `⚠️ ${trip.vehicle_name}: ${msg}` });
      return;
    }

    // Reach a stop
    const nextStopIdx = trip.current_stop_index;
    if (nextStopIdx < trip.stops.length && newProgress < 95) {
      updateTrip(trip.trip_id, {
        status: TRIP_STATUS.AT_STOP,
        current_stop_index: nextStopIdx,
        progress_pct: newProgress,
        notes: `Arrived at ${trip.stops[nextStopIdx]}`
      });
      setVehicleStatus(trip.vehicle_id, VEHICLE_STATUS.AT_STOP);
      pushEvent(EVENT_TYPES.STOP_REACHED, {
        trip_id:  trip.trip_id,
        vehicle:  trip.vehicle_name,
        stop:     trip.stops[nextStopIdx],
        message:  `📍 ${trip.vehicle_name} has arrived at ${trip.stops[nextStopIdx]}. Stop ${nextStopIdx + 1}/${trip.stops.length}.`
      });
    } else if (newProgress >= 95) {
      _completeTrip(trip);
    } else {
      updateTrip(trip.trip_id, { progress_pct: newProgress });
    }
    return;
  }

  // ── At Stop → depart again ───────────────
  if (trip.status === TRIP_STATUS.AT_STOP) {
    const nextIdx = trip.current_stop_index + 1;
    updateTrip(trip.trip_id, {
      status: TRIP_STATUS.EN_ROUTE,
      current_stop_index: nextIdx,
      progress_pct: Math.min(90, trip.progress_pct + 8)
    });
    setVehicleStatus(trip.vehicle_id, VEHICLE_STATUS.EN_ROUTE);
    pushEvent(EVENT_TYPES.DEPARTURE, {
      trip_id: trip.trip_id,
      vehicle: trip.vehicle_name,
      message: `🛣️ ${trip.vehicle_name} departing — heading towards ${trip.stops[nextIdx] || trip.destination}.`
    });
    return;
  }

  // ── Delayed → resume ─────────────────────
  if (trip.status === TRIP_STATUS.DELAYED) {
    updateTrip(trip.trip_id, { status: TRIP_STATUS.EN_ROUTE });
    setVehicleStatus(trip.vehicle_id, VEHICLE_STATUS.EN_ROUTE);
    pushEvent("DELAY_RESOLVED", {
      trip_id: trip.trip_id,
      vehicle: trip.vehicle_name,
      message: `✅ ${trip.vehicle_name} is back on the road — delay resolved.`
    });
  }
}

function _completeTrip(trip) {
  updateTrip(trip.trip_id, {
    status:       TRIP_STATUS.COMPLETED,
    progress_pct: 100,
    notes:        `Trip completed! Arrived at ${trip.destination}.`
  });
  setVehicleStatus(trip.vehicle_id, VEHICLE_STATUS.COMPLETED, { fuel_level: Math.max(10, Math.floor(Math.random() * 40)) });
  pushEvent(EVENT_TYPES.TRIP_COMPLETED, {
    trip_id:  trip.trip_id,
    vehicle:  trip.vehicle_name,
    route:    trip.route_name,
    message:  `🏁 ${trip.vehicle_name} has completed the journey — ${trip.route_name}. Welcome to ${trip.destination}!`
  });
}

// ─────────────────────────────────────────────
// TRIP GENERATOR
// ─────────────────────────────────────────────

export function generateNewTrip(vehicles) {
  return _generateNewTrip(vehicles || getVehicles());
}

function _generateNewTrip(vehicles) {
  const parkedVehicles = vehicles.filter(v =>
    v.status === VEHICLE_STATUS.PARKED || v.status === VEHICLE_STATUS.COMPLETED
  );
  if (parkedVehicles.length === 0) return;

  const vehicle = parkedVehicles[Math.floor(Math.random() * parkedVehicles.length)];
  const route = ROUTE_TEMPLATES[Math.floor(Math.random() * ROUTE_TEMPLATES.length)];
  const names = ["The Williams Family", "Rodriguez Crew", "Park Adventurers", "O'Brien Expedition", "Thompson Group"];
  const traveller = names[Math.floor(Math.random() * names.length)];

  const newTrip = {
    trip_id:            `TRIP-${Date.now()}`,
    vehicle_id:         vehicle.vehicle_id,
    vehicle_name:       vehicle.name,
    route_id:           route.route_id,
    route_name:         route.name,
    traveller_name:     traveller,
    status:             TRIP_STATUS.SCHEDULED,
    departure:          route.departure,
    destination:        route.destination,
    current_stop_index: 0,
    stops:              route.stops,
    departed_at:        null,
    eta:                new Date(Date.now() + route.estimated_days * 24 * 60 * 60 * 1000).toISOString(),
    progress_pct:       0,
    notes:              "Auto-generated trip — ready to depart."
  };

  storage.update(AP3X_KEYS.TRIPS, (trips) => [...(trips || []), newTrip]);
  setVehicleStatus(vehicle.vehicle_id, VEHICLE_STATUS.EN_ROUTE);
  pushEvent("TRIP_GENERATED", {
    trip_id: newTrip.trip_id,
    vehicle: vehicle.name,
    route:   route.name,
    message: `🗺️ New trip generated: ${vehicle.name} → ${route.name} (${traveller})`
  });

  return newTrip;
}
