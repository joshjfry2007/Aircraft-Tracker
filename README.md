# Aircraft Tracker

A lightweight live aircraft radar built with React and Leaflet, pulling real-time ADS-B flight states from the OpenSky Network.

## Setup

```bash
npm install
npm run dev
```

The app will start at `http://localhost:5173`.

## How It Works

### 1. Data Fetching & Polling
Flight data is retrieved from OpenSky's `/api/states/all` endpoint. Because OpenSky has strict rate limits for unauthenticated requests and does not support CORS for client-side browser requests, all requests are routed through a local Vite proxy (`/api/states -> https://opensky-network.org/api/states/all`).

The polling logic lives inside the custom `useAircraft` hook:
- Polls every 15 seconds (`poll_sec`).
- If an error or rate limit (HTTP 429) occurs, polling doubles its backoff delay up to 2 minutes (`mx_delay`).
- Retains temporarily missing planes for 2 minutes (`wait_s`) before dropping them from memory, preventing flickering when transponder packets are intermittently dropped.
- Builds a rolling breadcrumb trail of up to 20 coordinates (`mx_trail`) per aircraft.

### 2. Region Bounding Box vs. Filters
- **Region Dropdown**: Changing the region updates the bounding box coordinates (`lamin`, `lomin`, `lamax`, `lomax`) sent to the API. The hook reacts to this change and restarts polling for that specific geographic area.
- **Altitude & Speed Filters**: Filtering happens entirely on the client side in `App.jsx` after data is fetched. This avoids restarting the polling loop or burning API quota whenever the user adjusts an input.

### 3. Handling Unknown / Null Telemetry
OpenSky frequently returns `null` for altitude or velocity when ground receivers fail to capture complete transponder messages.

In this project, missing values fall back to `0` using the nullish coalescing operator:
```js
(a.altitude ?? 0) >= minAlt && (a.velocity ?? 0) >= minSpeed
```
Planes with unknown altitude or velocity are treated as `0`. When the minimum filters are left at `0`, unknown planes remain visible. Once a minimum threshold is set, planes without confirmed altitude or speed are excluded so that only verified telemetry is shown.

### 4. Selection & Flight Trails
- Clicking an aircraft marker selects it by its unique `icao24` ID.
- The selected plane is highlighted with a red halo, and its recent flight trail is drawn as a polyline on the map.
- Switching regions or clicking anywhere on the empty map clears the selection.

### 5. Offline / Sample Mode
To test locally without burning API credits or hitting HTTP 429 rate limits, toggle `USE_SAMPLE = true` at the top of `src/App.jsx`. This uses `src/fake_sample.json` and skips network requests entirely while filtering by the active region's bounding box.

## Project Structure

```
src/
├── api.jsx           # OpenSky fetcher and response normalizer
├── useAircraft.js    # Polling hook, stale retention, and trail tracking
├── App.jsx           # Main UI: region select, filters, and Leaflet map
├── App.css           # Dark theme and panel box styling
├── regions.js        # Geographic bounding boxes (South India, UK, UAE)
└── fake_sample.json  # Offline mock payload
```
