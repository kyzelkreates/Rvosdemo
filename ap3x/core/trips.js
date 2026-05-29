// AP3X — core/trips.js
// Trip & Route state model

import { storage, AP3X_KEYS, rawLog } from "./storage.js";

// ─────────────────────────────────────────────
// TRIP STATUS ENUM
// ─────────────────────────────────────────────

export const TRIP_STATUS = {
  SCHEDULED:  "scheduled",
  DEPARTED:   "departed",
  EN_ROUTE:   "en_route",
  AT_STOP:    "at_stop",
  COMPLETED:  "completed",
  DELAYED:    "delayed"
};

// ─────────────────────────────────────────────
// SEED ROUTES
// ─────────────────────────────────────────────

const ROUTE_TEMPLATES = [
  {
    route_id: "RT-001",
    name: "Pacific Coast Highway Run",
    departure: "San Francisco, CA",
    destination: "Los Angeles, CA",
    stops: ["Santa Cruz", "Big Sur", "San Simeon", "Morro Bay", "San Luis Obispo"],
    total_miles: 440,
    estimated_days: 5,
    terrain: "Coastal",
    highlights: ["Bixby Creek Bridge", "Elephant Seal Vista", "Hearst Castle"]
  },
  {
    route_id: "RT-002",
    name: "Rocky Mountain Circuit",
    departure: "Denver, CO",
    destination: "Denver, CO",
    stops: ["Estes Park", "Grand Lake", "Glenwood Springs", "Aspen", "Breckenridge"],
    total_miles: 380,
    estimated_days: 6,
    terrain: "Mountain",
    highlights: ["Rocky Mountain National Park", "Independence Pass", "Blue Mesa Reservoir"]
  },
  {
    route_id: "RT-003",
    name: "Deep South Explorer",
    departure: "Nashville, TN",
    destination: "New Orleans, LA",
    stops: ["Memphis", "Tupelo", "Birmingham", "Montgomery", "Mobile"],
    total_miles: 510,
    estimated_days: 7,
    terrain: "Mixed",
    highlights: ["Graceland", "Natchez Trace Parkway", "Bourbon Street"]
  },
  {
    route_id: "RT-004",
    name: "New England Leaf Loop",
    departure: "Boston, MA",
    destination: "Burlington, VT",
    stops: ["Concord NH", "North Conway", "Stowe", "Montpelier"],
    total_miles: 290,
    estimated_days: 4,
    terrain: "Forest",
    highlights: ["White Mountains", "Kancamagus Highway", "Lake Champlain"]
  }
];

// ─────────────────────────────────────────────
// SEED TRIPS
// ─────────────────────────────────────────────

function buildSeedTrips() {
  const now = new Date();
  return [
    {
      trip_id: "TRIP-001",
      vehicle_id: "RV-002",
      vehicle_name: "Coastal Drifter",
      route_id: "RT-001",
      route_name: "Pacific Coast Highway Run",
      traveller_name: "The Hendersons",
      status: TRIP_STATUS.EN_ROUTE,
      departure: "San Francisco, CA",
      destination: "Los Angeles, CA",
      current_stop_index: 2,
      stops: ["Santa Cruz", "Big Sur", "San Simeon", "Morro Bay", "San Luis Obispo"],
      departed_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      eta: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      progress_pct: 42,
      notes: "Stopped at Big Sur for an extra night — beautiful views."
    },
    {
      trip_id: "TRIP-002",
      vehicle_id: "RV-003",
      vehicle_name: "Summit Explorer",
      route_id: "RT-002",
      route_name: "Rocky Mountain Circuit",
      traveller_name: "Patel Family",
      status: TRIP_STATUS.AT_STOP,
      departure: "Denver, CO",
      destination: "Denver, CO",
      current_stop_index: 1,
      stops: ["Estes Park", "Grand Lake", "Glenwood Springs", "Aspen", "Breckenridge"],
      departed_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      eta: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      progress_pct: 18,
      notes: "Currently resting at Estes Park campsite."
    },
    {
      trip_id: "TRIP-003",
      vehicle_id: "RV-001",
      vehicle_name: "Horizon Cruiser",
      route_id: "RT-004",
      route_name: "New England Leaf Loop",
      traveller_name: "Morrison Group",
      status: TRIP_STATUS.SCHEDULED,
      departure: "Boston, MA",
      destination: "Burlington, VT",
      current_stop_index: 0,
      stops: ["Concord NH", "North Conway", "Stowe", "Montpelier"],
      departed_at: null,
      eta: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      progress_pct: 0,
      notes: "Departing tomorrow morning."
    }
  ];
}

// ─────────────────────────────────────────────
// ACCESSORS
// ─────────────────────────────────────────────

export function getTrips() {
  const stored = storage.get(AP3X_KEYS.TRIPS);
  if (!stored || stored.length === 0) {
    const seed = buildSeedTrips();
    storage.set(AP3X_KEYS.TRIPS, seed);
    return seed;
  }
  return stored;
}

export function getRoutes() {
  const stored = storage.get(AP3X_KEYS.ROUTES);
  if (!stored || stored.length === 0) {
    storage.set(AP3X_KEYS.ROUTES, ROUTE_TEMPLATES);
    return ROUTE_TEMPLATES;
  }
  return stored;
}

export function getTripById(id) {
  return getTrips().find(t => t.trip_id === id) || null;
}

export function getActiveTrip() {
  const id = storage.get(AP3X_KEYS.ACTIVE_TRIP);
  if (!id) return getTrips().find(t => t.status === TRIP_STATUS.EN_ROUTE || t.status === TRIP_STATUS.AT_STOP) || null;
  return getTripById(id);
}

export function setActiveTrip(id) {
  storage.set(AP3X_KEYS.ACTIVE_TRIP, id);
}

export function updateTrip(id, patch) {
  storage.update(AP3X_KEYS.TRIPS, (trips) => {
    if (!trips) trips = buildSeedTrips();
    return trips.map(t => t.trip_id === id ? { ...t, ...patch } : t);
  });
  rawLog("TRIP_UPDATED", { id, ...patch });
}

export function getTripSummary() {
  const trips = getTrips();
  return {
    total:     trips.length,
    active:    trips.filter(t => t.status === TRIP_STATUS.EN_ROUTE || t.status === TRIP_STATUS.AT_STOP).length,
    scheduled: trips.filter(t => t.status === TRIP_STATUS.SCHEDULED).length,
    completed: trips.filter(t => t.status === TRIP_STATUS.COMPLETED).length,
    delayed:   trips.filter(t => t.status === TRIP_STATUS.DELAYED).length
  };
}

export function onTripsChange(callback) {
  return storage.subscribe(AP3X_KEYS.TRIPS, callback);
}

export { ROUTE_TEMPLATES };
