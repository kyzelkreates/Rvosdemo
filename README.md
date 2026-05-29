# AP3X — Motorhome & RV Intelligent Travel Management Simulation OS

A live motorhome and RV travel management simulation platform with AI-assisted journey planning, real-time trip progression, and cross-device coordination dashboards.

## System Overview

| System | Path | Description |
|--------|------|-------------|
| 🖥️ Command OS | `ap3x/` | Desktop fleet management dashboard |
| 📱 Traveller PWA | `ap3x-pwa/` | Mobile-first trip companion |
| 🌐 Simulation Hub | `ap3x-hub/` | Interactive demo & simulation controls |

## Features

- **Trip Generator Engine** — auto-generates journeys across 4 curated US routes
- **Vehicle State Engine** — 6 motorhomes simulated across Parked / En Route / At Stop / Maintenance / Completed states
- **Live Event Stream** — real-time trip events cross-synced across all three systems
- **AP3X Travel Intelligence AI** — route insights, stop recommendations, fleet summaries
- **Travel Checklist System** — pre-departure checks for travellers
- **PWA Support** — installable on mobile devices

## Architecture

```
ap3x/
  core/          — storage.js, vehicles.js, trips.js
  engine/        — simulation-engine.js, ai-assistant.js
  ui/            — dashboard.js, ap3x.css
  index.html     — Command OS entry point

ap3x-pwa/
  ui/            — traveller.js, traveller.css
  index.html     — Traveller PWA entry point

ap3x-hub/
  ui/            — hub.js, hub.css
  index.html     — Simulation Hub entry point
```

All three systems share a reactive localStorage state layer with cross-tab sync.

## Usage

Open `ap3x-hub/index.html` to launch the full simulation hub, or open any system independently.

> **Simulation only** — not real-world vehicle control, navigation, or safety software.
