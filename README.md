# ⚓ POSEIDON — Maritime Intelligence Platform

> **Production-grade vessel tracking · Spatial anomaly detection · LLM-powered threat assessment**

![Platform Status](https://img.shields.io/badge/status-active-16A34A?style=flat-square)
![React](https://img.shields.io/badge/React-18-0EA5E9?style=flat-square&logo=react)
![Claude](https://img.shields.io/badge/Claude-Sonnet_4.6-F0A500?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-8B5CF6?style=flat-square)
![Vessels](https://img.shields.io/badge/vessels_tracked-150-E53E3E?style=flat-square)

---


## Data Sources — Live vs Demo

This platform runs in two modes, and it is explicit about which one is active at all times (status indicator, top-right).

**LIVE mode** — Click **Connect Live Feed** and paste a free [AISStream.io](https://aisstream.io) API key. The app opens a real WebSocket to `wss://stream.aisstream.io/v0/stream`, subscribes to a global bounding box, and parses live AIS `PositionReport` and `ShipStaticData` messages. These are **real vessels broadcasting their real positions** over the global AIS network — actual ships, actual coordinates, actual names, updating live.

**DEMO mode** (default) — With no key entered, the platform runs a high-fidelity simulation: 500 vessels moving along real-world shipping lanes with synthetic anomaly injection. This is clearly labeled **SIMULATED / DEMO** in the UI and the KPI source indicator. It exists so the platform is fully explorable without requiring anyone to sign up for anything.

**Why bring-your-own-key?** This is a static page hosted on GitHub Pages with no backend. Embedding a shared API key in client code would expose it publicly. The honest, secure architecture is: each user supplies their own free key, it lives only in browser memory, and it is transmitted only to AISStream — never stored, logged, or committed to this repo.

## What Is This

POSEIDON is a full-stack maritime domain awareness platform built entirely in React, with zero mapping library dependencies. It ingests AIS (Automatic Identification System) vessel telemetry — either live or from a high-fidelity mock feed — processes it through a custom spatial analytics engine, and surfaces anomalies to an LLM for automated tactical intelligence generation.

The goal is a portfolio-grade demonstration of how modern AI tooling can compress what used to require a team of watch-standers (manual AIS monitoring, pattern-of-life analysis, regulatory cross-referencing) into a single, real-time intelligence interface.

---

## Live Demo

The fastest way to run it: paste `src/App.jsx` into [claude.ai](https://claude.ai) as a React artifact. It runs without a build step, with the Anthropic API already wired in.

For local deployment, see [Setup](#setup) below.

---

## Screenshots

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚓ POSEIDON  [MAP] [FLEET] [EVENTS] [CARGO] [INTEL]    AIS LIVE ●  │
├──────────────────────────────────────────────────────────────────────┤
│ VESSELS  DARK  STS  ANOMALOUS  AVG SPD  FLAGS  DWT  ZONE ALERTS    │
│   150      3    2      11      12.4kt    14   2.1B MT    4          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ████ EUROPE  ████████ ASIA ████                 [Vessel Detail]    │
│       ████ AFRICA ████          ██ AUS           MV Pacific Voyager │
│  ████ N.AM ████                                  MMSI: 900000123    │
│       ████ S.AM ████       ▲ ▲ ▲ ▲ ▲            Speed: 12.1 kts   │
│                              ▲ ▲ ▲               Status: UNDERWAY  │
│  ▲=vessel  ●=anomaly  ○=geofence zone            ...               │
│                                                  [⚡ AI ASSESSMENT] │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Features

### 🗺️ Live World Map
- Custom SVG Mercator projection — no Leaflet, no Mapbox, no tile dependencies
- 20+ continent/island landmass polygons rendered as SVG paths
- 150 vessels distributed across 15 real global shipping lanes (Trans-Pacific, Asia-Europe, Cape Route, Indian Ocean, Mediterranean, and more)
- Vessel heading indicators, track trails, animated dark-event pulse rings
- Clickable vessel selection with speed vector overlay
- 6 geofence zones (Malacca Strait, Gulf of Aden, Hormuz, Suez, Panama, Hong Kong) with risk-classified overlays

### 🚢 Fleet Registry
- Full searchable, filterable table of all 150 tracked vessels
- Filter by status: UNDERWAY · DARK · STS_OPERATION · ANOMALY
- One-click jump from fleet list to map selection

### ⚡ AI Threat Assessment
- Powered by Claude Sonnet via the Anthropic API
- Triggered per-vessel when anomalies are detected
- Structured output: risk score (0–100), tactical assessment, probable explanations, recommended actions, regulatory references (SOLAS/MARPOL), environmental impact statement, confidence score
- Graceful fallback to rule-based analysis if API unavailable

### 📡 Anomaly Detection (4 types)
| Type | Trigger | Severity |
|------|---------|---------|
| `AIS_DARK` | Vessel transponder goes offline | HIGH |
| `SPEED_ANOMALY` | Speed exceeds 22 knots threshold | MEDIUM |
| `STS_TRANSFER` | Ship-to-ship transfer pattern detected | HIGH |
| `GEOFENCE_BREACH` | Entry into high-risk zone | MEDIUM–CRITICAL |

### 📦 Cargo & ETA Analytics
- Fleet-wide cargo type distribution with animated bar charts
- Speed-over-ground ETA prediction for all 150 vessels to their destination waypoints
- Haversine great-circle distance calculations

### 🔍 Intelligence Summary Tab
- Dark vessel roster with one-click map navigation
- Active STS operations list
- Zone-by-zone breach count dashboard
- Fleet-wide statistics: anomaly counts, average speed, total DWT, flag state count

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     POSEIDON PLATFORM                       │
├───────────────┬───────────────┬─────────────┬──────────────┤
│  MODULE 1     │  MODULE 2     │  MODULE 3   │  MODULE 4    │
│  CONFIG       │  AIS ENGINE   │  SPATIAL    │  INTELLIGENCE│
│               │               │             │              │
│  • Geofences  │  • initVessel │  • toXY()   │  • runAI()   │
│  • Thresholds │  • updateV()  │  • Mercator │  • Claude    │
│  • Design sys │  • useAIS()   │  • Haversine│    API call  │
│  • Lane defs  │  • Dual timer │  • Geofence │  • Structured│
│               │  • Event bus  │    testing  │    JSON out  │
└───────────────┴───────────────┴─────────────┴──────────────┘
                              │
              ┌───────────────▼────────────────┐
              │      MODULE 5: DASHBOARD       │
              │  MAP · FLEET · EVENTS ·        │
              │  CARGO · INTEL                 │
              └────────────────────────────────┘
```

### Key Technical Decisions

**No mapping library** — The SVG world map is hand-projected using the Web Mercator formula (`y = H/2 - ln(tan(π/4 + lat/2)) / 2π * H`). This keeps the bundle tiny, removes tile licensing concerns, and makes the whole codebase self-contained.

**Dual-timer AIS simulation** — Position updates fire every 3.5 seconds; anomaly injection fires every 8 seconds on a separate interval. This mirrors real AIS cadence (Class A transponders report every 2–10 seconds) and decouples normal movement from threat event simulation.

**Parametric lane interpolation** — Vessels follow actual global shipping routes using segment-based linear interpolation with small noise offsets. They don't random-walk; they travel the Trans-Pacific, Asia-Europe, Cape, and other real commercial routes.

**Stateless per-vessel anomaly model** — Each vessel carries a rolling 5-event anomaly history. No server required. The full state fits comfortably in React's `useState`.

**LLM prompt engineering** — The intelligence module sends a structured context block (vessel identity, cargo, flag, position, speed, anomaly type, geofence status, ETA) and requests a typed JSON response. The prompt explicitly forbids markdown fences to make parsing reliable.

---

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Anthropic API key (optional — platform runs without it, AI assessment falls back to rule-based analysis)

### Install & Run

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/poseidon-maritime.git
cd poseidon-maritime

# 2. Install
npm install

# 3. Configure (optional — for live AI assessment)
cp .env.example .env
# Edit .env and add your REACT_APP_ANTHROPIC_API_KEY

# 4. Run
npm start
# Opens at http://localhost:3000
```

### Production Build

```bash
npm run build
# Output in /build — deploy to Vercel, Netlify, S3, or any static host
```

### Deploy to Vercel (one command)

```bash
npx vercel --prod
```

---

## Connecting a Live AIS Feed

The platform is designed to swap the mock ingestion engine for a real AIS provider with minimal changes. Replace the `useAIS` hook's `setInterval` tick with a WebSocket connection:

```javascript
// Replace the mock tick in useAIS() with:
const ws = new WebSocket(process.env.REACT_APP_AIS_PROVIDER_URL);

ws.onmessage = (msg) => {
  const sentence = JSON.parse(msg.data); // NMEA 0183 or provider JSON
  setVessels(prev => {
    const idx = prev.findIndex(v => v.id === `MMSI${sentence.mmsi}`);
    if (idx === -1) return prev; // new vessel — add to fleet
    const next = [...prev];
    next[idx] = {
      ...next[idx],
      lon: sentence.lon,
      lat: sentence.lat,
      speed: sentence.sog,       // speed over ground
      heading: sentence.hdg,
      course: sentence.cog,      // course over ground
      status: sentence.navStatus,
      lastContact: Date.now(),
    };
    return next;
  });
};
```

**Recommended AIS providers:**
| Provider | Coverage | Free Tier | Notes |
|---------|---------|-----------|-------|
| [AISHub](https://www.aishub.net) | Global | Yes (share-for-share) | Good for hobby/portfolio |
| [MarineTraffic API](https://www.marinetraffic.com/en/ais-api-services) | Global | No | Industry standard |
| [Spire Maritime](https://spire.com/maritime/) | Global + satellite | No | Best coverage, enterprise |
| [VesselFinder](https://www.vesselfinder.com/api) | Global | Limited | Affordable entry point |

---

## Data Model

```typescript
interface Vessel {
  id: string;            // MMSI — 9-digit Maritime Mobile Service Identity
  name: string;          // Vessel name (e.g. "MV Pacific Voyager")
  imo: string;           // IMO permanent identifier
  flag: string;          // Flag state / registry jurisdiction
  cargo: string;         // Primary cargo type
  lon: number;           // Longitude, WGS-84
  lat: number;           // Latitude, WGS-84
  heading: number;       // True heading 0–360°
  speed: number;         // Speed over ground, knots
  status: VesselStatus;  // UNDERWAY | DARK | STS_OPERATION | ANCHORED | MOORED
  track: TrackPoint[];   // Last 30 position fixes
  anomalies: Anomaly[];  // Last 5 anomaly events
  draught: string;       // Current draught in meters
  length: number;        // Length overall in meters
  dwt: number;           // Deadweight tonnage
  grossTonnage: number;  // Gross registered tonnage
  destination: [number, number]; // Destination waypoint [lon, lat]
}

interface Anomaly {
  type: "AIS_DARK" | "SPEED_ANOMALY" | "STS_TRANSFER" | "GEOFENCE_BREACH";
  ts: number;       // Unix timestamp
  severity: "MINIMAL" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  desc?: string;    // Human-readable description
}

interface AIAssessment {
  riskScore: number;           // 0–100
  riskLevel: string;           // MINIMAL | LOW | MODERATE | HIGH | CRITICAL
  tacticalAssessment: string;  // 2-sentence narrative
  probableExplanations: string[];
  recommendedActions: string[];
  flagsOfConcern: string[];
  environmentalImpact: string;
  regulatoryReferences: string[]; // SOLAS/MARPOL citations
  confidence: number;          // 0–100
}
```

---

## Shipping Lanes Modeled

| Lane | Route |
|------|-------|
| Trans-Pacific North | Los Angeles → Hawaii → Yokohama → Shanghai |
| Trans-Pacific South | Panama → Tahiti → Sydney |
| Asia-Europe | Shanghai → Malacca → Indian Ocean → Suez → Gibraltar → Rotterdam |
| Trans-Atlantic North | New York → North Atlantic → English Channel |
| Trans-Atlantic South | Rio de Janeiro → West Africa → Indian Ocean |
| Cape of Good Hope | Singapore → Cape Town → West Africa |
| Gulf-Europe | Strait of Hormuz → Gulf of Aden → Suez → Med |
| Pacific Coast North | Los Angeles → Gulf of Mexico → Panama |
| Pacific Coast South | Panama → Peru → Chile |
| Indian Ocean West | Hormuz → East Africa → Cape Town |
| Indian Ocean East | Hormuz → India → Malacca |
| North Sea | Rotterdam → Hamburg → Oslo |
| Mediterranean | Gibraltar → Genoa → Athens |
| SE Asia | Singapore → Manila → Tokyo |
| East Africa | Mozambique → Kenya → Djibouti |

---

## Geofence Zones

| Zone | Risk Level | Notes |
|------|-----------|-------|
| Strait of Hormuz | CRITICAL | ~20% of global oil passes here |
| Malacca Strait | CRITICAL | Highest piracy density in Asia |
| Gulf of Aden | CRITICAL | Houthi interdiction zone |
| Hong Kong Anchorage | HIGH | Sanctions evasion risk |
| Suez Approaches | HIGH | Chokepoint, Houthi threat range |
| Panama Canal | MEDIUM | Traffic volume congestion risk |

---

## Design System

The UI uses a bespoke naval operations dark palette — no component library.

```
Ocean background   #030810   near-black deep ocean
Panel surface      #060D18   raised panel
Accent amber       #F0A500   radar ping / primary CTA
Alert red          #E53E3E   critical / dark vessel
Track cyan         #0EA5E9   vessel trails / anchored
Intel purple       #8B5CF6   analytics / cluster data
Display font       JetBrains Mono   all data/telemetry
UI font            Inter            labels and prose
```

**Signature element:** When a vessel goes AIS-dark, an animated red pulse ring radiates outward from its position — encoding signal loss as a visual event without requiring the operator to read any text. The ring grows from radius 5 to 22 over 2 seconds, opacity 0.9 → 0, on infinite repeat.

---

## Extending the Platform

### Add sanctions screening (OFAC/UN)
```javascript
async function screenVessel(vessel) {
  const res = await fetch(`/api/ofac/screen?name=${vessel.name}&imo=${vessel.imo}`);
  const { match, list, confidence } = await res.json();
  if (match) vessel.anomalies.push({ type: "SANCTIONS_HIT", severity: "CRITICAL", list });
}
```

### Add weather overlay (OpenWeatherMap Marine)
```javascript
const wx = await fetch(
  `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${KEY}`
);
const { wind, waves } = await wx.json();
// Render as SVG layer above ocean, below vessels
```

### Add multi-turn LLM interrogation
```javascript
// Extend runAI() to accept conversation history:
messages: [
  { role: "user", content: initialPrompt },
  { role: "assistant", content: JSON.stringify(previousAssessment) },
  { role: "user", content: "What additional vessels should we cross-reference?" }
]
```

### Add port call prediction
```javascript
// Use destination waypoint + heading divergence to predict next port
// Cross-reference with UN/LOCODE database for port identification
```

---

## References

- **IMO AIS Standard** — SOLAS Chapter V, Regulation 19.2
- **MARPOL Annex I** — Oil pollution prevention zone definitions
- **IMO Cyber Guidelines** — MSC-FAL.1/Circ.3
- **Haversine formula** — Sinnott, R.W. (1984). *Virtues of the Haversine*. Sky and Telescope, 68(2), 158.
- **Web Mercator** — EPSG:3857, the projection used by Google Maps / OpenStreetMap
- **AIS Message Types** — ITU-R M.1371-5 technical characteristics standard

---

## License

MIT — use freely, attribute if you're feeling kind.

---

*Built with React 18 · Claude Sonnet · Vanilla SVG cartography · Zero map tile dependencies*

*150 vessels. 15 shipping lanes. 6 geofence zones. 1 planet.*
