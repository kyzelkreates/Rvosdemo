// AP3X — engine/ai-assistant.js
// AP3X Travel Intelligence Assistant
// SIMULATION ONLY — no real-world driving instructions, no safety-critical claims.

import { storage, AP3X_KEYS } from "../core/storage.js";
import { getTrips, getTripById, TRIP_STATUS } from "../core/trips.js";
import { getVehicles, getFleetSummary } from "../core/vehicles.js";

// ─────────────────────────────────────────────
// AI MESSAGE STORE
// ─────────────────────────────────────────────

export function getAIMessages() {
  return storage.get(AP3X_KEYS.AI_MESSAGES) || [];
}

export function pushAIMessage(role, text, context = null) {
  storage.update(AP3X_KEYS.AI_MESSAGES, (msgs) => {
    const list = msgs || [];
    const msg = {
      msg_id:    crypto.randomUUID(),
      role,       // "assistant" | "user"
      text,
      context,
      timestamp: new Date().toISOString()
    };
    return [msg, ...list].slice(0, 50);
  });
}

export function onAIMessagesChange(callback) {
  return storage.subscribe(AP3X_KEYS.AI_MESSAGES, callback);
}

// ─────────────────────────────────────────────
// AI INTELLIGENCE ENGINE
// ─────────────────────────────────────────────

const ROUTE_TIPS = {
  "RT-001": [
    "The Pacific Coast Highway is best driven northbound in the morning to avoid sun glare — southbound travellers enjoy spectacular sunset views.",
    "Big Sur has limited fuel stations. Recommend topping up at Carmel before heading south.",
    "Elephant Seal Vista Point at San Simeon is a must-stop — seals are most active December–March.",
    "Bixby Creek Bridge is one of the most photographed spots on the PCH. Best light: early morning."
  ],
  "RT-002": [
    "Rocky Mountain altitude increases significantly after Estes Park — allow extra acclimatisation time.",
    "Independence Pass (near Aspen) closes in winter. Check seasonal access before scheduling.",
    "Glenwood Canyon is breathtaking but can have rock fall closures — check I-70 advisories.",
    "Blue Mesa Reservoir is the largest in Colorado — excellent for a rest day mid-circuit."
  ],
  "RT-003": [
    "The Natchez Trace Parkway has no commercial vehicles and no billboards — a serene drive through history.",
    "Memphis traffic peaks 7–9am and 4–6pm. Recommend early arrival or midday transit.",
    "Mobile's battleship USS Alabama is an unmissable afternoon stop.",
    "New Orleans has limited large vehicle parking — coordinate campsite access in advance."
  ],
  "RT-004": [
    "New England fall foliage peaks mid-October — book campsites well in advance during peak season.",
    "The Kancamagus Highway (Route 112) is closed to large vehicles in certain sections — verify clearance.",
    "Stowe, Vermont has exceptional farm-to-table dining — ideal rest day destination.",
    "Lake Champlain ferry crossing from Charlotte, VT to Essex, NY is a memorable short diversion."
  ]
};

const GENERAL_TIPS = [
  "Always carry a 72-hour emergency kit — water, food, first aid, and a power bank.",
  "Campsite reservations fill quickly on holiday weekends. Book 2–3 weeks ahead for popular routes.",
  "Fuel consumption increases significantly on mountain grades. Plan fuel stops accordingly.",
  "Wildlife crossings are most active at dawn and dusk — maintain reduced speed in rural areas.",
  "Weather apps calibrated for sea-level may underestimate mountain temperature drops."
];

export function generateTripInsight(tripId) {
  const trip = getTripById(tripId);
  if (!trip) return _defaultInsight();

  const routeTips = ROUTE_TIPS[trip.route_id] || GENERAL_TIPS;
  const tip = routeTips[Math.floor(Math.random() * routeTips.length)];

  const statusPhrases = {
    [TRIP_STATUS.SCHEDULED]: `${trip.vehicle_name} is ready to depart for the ${trip.route_name}. All systems green — anticipate ${trip.stops.length} stops along the way.`,
    [TRIP_STATUS.EN_ROUTE]:  `${trip.vehicle_name} is making good progress on the ${trip.route_name}. Current journey is ${trip.progress_pct}% complete.`,
    [TRIP_STATUS.AT_STOP]:   `${trip.vehicle_name} is currently resting at ${trip.stops[trip.current_stop_index] || "a waypoint"}. Estimated ${trip.stops.length - trip.current_stop_index} more stops ahead.`,
    [TRIP_STATUS.COMPLETED]: `${trip.vehicle_name} has successfully completed the ${trip.route_name}. Journey concluded at ${trip.destination}.`,
    [TRIP_STATUS.DELAYED]:   `${trip.vehicle_name} is experiencing a brief delay on the ${trip.route_name}. The simulation engine is resolving this automatically.`
  };

  const status = statusPhrases[trip.status] || `${trip.vehicle_name} is on the ${trip.route_name}.`;
  return `${status}\n\n💡 Route insight: ${tip}`;
}

export function generateFleetSummary() {
  const summary = getFleetSummary();
  const trips = getTrips();
  const active = trips.filter(t => t.status === TRIP_STATUS.EN_ROUTE || t.status === TRIP_STATUS.AT_STOP);

  let msg = `Fleet overview: ${summary.total} vehicles total — ${summary.en_route} en route, ${summary.at_stop} at a stop, ${summary.parked} parked, ${summary.maintenance} in maintenance.\n\n`;

  if (active.length > 0) {
    msg += `Currently active journeys:\n`;
    active.forEach(t => {
      msg += `• ${t.vehicle_name} — ${t.route_name} (${t.progress_pct}% complete)\n`;
    });
  } else {
    msg += `No journeys currently active. Start a simulation to begin tracking.`;
  }

  return msg;
}

export function generateNextStopRecommendation(tripId) {
  const trip = getTripById(tripId);
  if (!trip) return "No active trip found. Start a simulation to begin journey tracking.";

  const nextStop = trip.stops[trip.current_stop_index] || trip.destination;
  const tips = [
    `Next stop: ${nextStop}. Look out for local fuel stations and campsite check-in times.`,
    `Approaching ${nextStop} — a great opportunity to check water tank levels and empty waste tanks if needed.`,
    `${nextStop} ahead. The simulation estimates arrival based on current road pace. Weather looks clear on this segment.`,
    `Heading to ${nextStop}. Consider a 15-minute rest stretch before arrival to refresh the crew.`
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

export function answerTravelQuery(query) {
  const q = query.toLowerCase();

  if (q.includes("fuel") || q.includes("petrol") || q.includes("gas")) {
    return "Fuel planning tip (simulation): For Class A motorhomes, estimate 7–10 mpg. On mountain routes, factor in 20% higher consumption. Always plan stops within 150 miles on remote sections.";
  }
  if (q.includes("weather") || q.includes("rain") || q.includes("storm")) {
    return "Weather advisory (simulation): This system simulates ideal and delayed conditions. In a real journey, always check NOAA weather radar and road condition apps before mountain or coastal sections.";
  }
  if (q.includes("camp") || q.includes("site") || q.includes("park")) {
    return "Campsite suggestion (simulation): Popular National Park sites book out weeks in advance. Recreation.gov handles federal reservations. State park sites are often less crowded and equally scenic.";
  }
  if (q.includes("route") || q.includes("road") || q.includes("highway")) {
    return "Route optimisation (simulation): Avoid interstate highways where possible — US scenic byways offer the authentic RV experience. The AP3X system tracks 4 curated routes optimised for motorhome travel.";
  }
  if (q.includes("fleet") || q.includes("vehicle") || q.includes("rv")) {
    return generateFleetSummary();
  }
  if (q.includes("trip") || q.includes("journey") || q.includes("status")) {
    const trips = getTrips();
    const active = trips.find(t => t.status === TRIP_STATUS.EN_ROUTE || t.status === TRIP_STATUS.AT_STOP);
    if (active) return generateTripInsight(active.trip_id);
    return "No active trips detected. Use the simulation controls to start a journey.";
  }

  // Generic response
  const responses = [
    "The AP3X Travel Intelligence system is tracking your fleet in real-time simulation. Ask me about routes, fuel, campsites, or fleet status.",
    "Good question for a road trip! The AP3X system has 4 curated US routes loaded — Pacific Coast, Rocky Mountains, Deep South, and New England.",
    "I'm simulating journey conditions across your active fleet. Check the Command OS for a full fleet overview, or the Traveller Interface for individual trip details.",
    "AP3X covers motorhome and RV simulation across Class A, B, C motorhomes and travel trailers. Ask about any specific vehicle or route."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function _defaultInsight() {
  return GENERAL_TIPS[Math.floor(Math.random() * GENERAL_TIPS.length)];
}
