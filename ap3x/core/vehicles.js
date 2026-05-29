// AP3X — core/vehicles.js
// Vehicle fleet state model

import { storage, AP3X_KEYS, rawLog } from "./storage.js";

// ─────────────────────────────────────────────
// VEHICLE STATUS ENUM
// ─────────────────────────────────────────────

export const VEHICLE_STATUS = {
  PARKED:      "parked",
  EN_ROUTE:    "en_route",
  AT_STOP:     "at_stop",
  MAINTENANCE: "maintenance",
  COMPLETED:   "completed"
};

// ─────────────────────────────────────────────
// SEED FLEET DATA
// ─────────────────────────────────────────────

export const SEED_VEHICLES = [
  { vehicle_id: "RV-001", name: "Horizon Cruiser", type: "Class A Motorhome", year: 2023, capacity: 6, status: VEHICLE_STATUS.PARKED,    fuel_level: 92, mileage: 14230, image_tag: "🚌" },
  { vehicle_id: "RV-002", name: "Coastal Drifter", type: "Class C Motorhome", year: 2022, capacity: 4, status: VEHICLE_STATUS.EN_ROUTE,  fuel_level: 68, mileage: 22107, image_tag: "🚐" },
  { vehicle_id: "RV-003", name: "Summit Explorer",  type: "5th Wheel Trailer",  year: 2024, capacity: 5, status: VEHICLE_STATUS.AT_STOP,   fuel_level: 55, mileage: 8491,  image_tag: "🏕️" },
  { vehicle_id: "RV-004", name: "Desert Wanderer",  type: "Class B Campervan",  year: 2023, capacity: 2, status: VEHICLE_STATUS.PARKED,    fuel_level: 100,mileage: 5230,  image_tag: "🚐" },
  { vehicle_id: "RV-005", name: "Lakeside Rambler", type: "Travel Trailer",     year: 2021, capacity: 4, status: VEHICLE_STATUS.MAINTENANCE,fuel_level: 30, mileage: 41800, image_tag: "🚗" },
  { vehicle_id: "RV-006", name: "Alpine Runner",    type: "Class A Motorhome",  year: 2024, capacity: 6, status: VEHICLE_STATUS.PARKED,    fuel_level: 87, mileage: 3100,  image_tag: "🚌" }
];

// ─────────────────────────────────────────────
// ACCESSORS
// ─────────────────────────────────────────────

export function getVehicles() {
  const stored = storage.get(AP3X_KEYS.VEHICLES);
  if (!stored || stored.length === 0) {
    storage.set(AP3X_KEYS.VEHICLES, SEED_VEHICLES);
    return SEED_VEHICLES;
  }
  return stored;
}

export function getVehicleById(id) {
  return getVehicles().find(v => v.vehicle_id === id) || null;
}

export function setVehicleStatus(id, status, extra = {}) {
  storage.update(AP3X_KEYS.VEHICLES, (vehicles) => {
    if (!vehicles) vehicles = SEED_VEHICLES;
    return vehicles.map(v => v.vehicle_id === id ? { ...v, status, ...extra } : v);
  });
  rawLog("VEHICLE_STATUS_UPDATE", { id, status });
}

export function updateVehicle(id, patch) {
  storage.update(AP3X_KEYS.VEHICLES, (vehicles) => {
    if (!vehicles) vehicles = SEED_VEHICLES;
    return vehicles.map(v => v.vehicle_id === id ? { ...v, ...patch } : v);
  });
}

export function getFleetSummary() {
  const vehicles = getVehicles();
  return {
    total:       vehicles.length,
    parked:      vehicles.filter(v => v.status === VEHICLE_STATUS.PARKED).length,
    en_route:    vehicles.filter(v => v.status === VEHICLE_STATUS.EN_ROUTE).length,
    at_stop:     vehicles.filter(v => v.status === VEHICLE_STATUS.AT_STOP).length,
    maintenance: vehicles.filter(v => v.status === VEHICLE_STATUS.MAINTENANCE).length,
    completed:   vehicles.filter(v => v.status === VEHICLE_STATUS.COMPLETED).length
  };
}

export function onVehiclesChange(callback) {
  return storage.subscribe(AP3X_KEYS.VEHICLES, callback);
}
