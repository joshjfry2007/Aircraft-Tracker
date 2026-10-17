
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAircraft } from "./useAircraft";
import { REGIONS } from "./regions";
import "./App.css";

const USE_SAMPLE = true;

function planeIcon(heading, stale, selected) {
  return L.divIcon({
    className: "",
    html: `<div style="
      transform: rotate(${(heading ?? 0) - 45}deg);
      font-size: ${selected ? "26px" : "20px"};
      opacity: ${stale ? 0.4 : 1};
      filter: ${selected ? "drop-shadow(0 0 6px #ff3333) drop-shadow(0 0 10px #ff0000)" : "none"};
      transition: transform 0.2s, font-size 0.2s;
    ">✈️</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function MapClickHandler({ onClear }) {
  useMapEvents({
    click: () => onClear(),
  });
  return null;
}

function App() {
  const [regionName, setRegionName] = useState("South India");
  const [minAlt, setMinAlt] = useState(0);
  const [minSpeed, setMinSpeed] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

  const bbox = REGIONS[regionName];
  const { aircraft, status } = useAircraft(bbox, USE_SAMPLE);
  const nowS = (status.lastUpdated ?? 0) / 1000;

  useEffect(() => {
    console.log("Aircraft:", aircraft);
  }, [aircraft]);

  const visible = Object.values(aircraft).filter(
    (a) => (a.altitude ?? 0) >= minAlt && (a.velocity ?? 0) >= minSpeed
  );

  const totalAircraft = Object.keys(aircraft).length;
  const center = [(bbox.lamin + bbox.lamax) / 2, (bbox.lomin + bbox.lomax) / 2];

  return (
    <div className="layout">
      <div className="panel">
        <div className="boxes select-box">
          <select value={regionName} onChange={(e) => { setRegionName(e.target.value); setSelectedId(null); }}>
            {Object.keys(REGIONS).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <label className="boxes">Min altitude (m): <input type="number" value={minAlt} onChange={(e) => setMinAlt(Number(e.target.value))} /></label>
        <label className="boxes">Min speed (m/s): <input type="number" value={minSpeed} onChange={(e) => setMinSpeed(Number(e.target.value))} /></label>

        <p className="boxes"><b>Showing {visible.length} of {totalAircraft} aircraft</b></p>

        {status.lastUpdated && (
          <span className="boxes">Last updated: {new Date(status.lastUpdated).toLocaleTimeString()}</span>
        )}

        {status.error && <span className="warn">⚠ {status.error}. Showing last known data, retrying…</span>}
      </div>

      <div className="map-wrapper">
        <MapContainer key={regionName} center={center} zoom={6} className="map">
          <MapClickHandler onClear={() => setSelectedId(null)} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />

          {visible.map((a) => {
            const stale = a.seenAt != null && nowS - a.seenAt > 45;
            const isSelected = a.id === selectedId;

            return (
              <Marker
                key={a.id}
                position={[a.lat, a.lon]}
                icon={planeIcon(a.heading, stale, isSelected)}
                eventHandlers={{ click: () => setSelectedId(a.id) }}
              >
                <Popup>
                  <b>{a.callsign || "Unknown callsign"}</b> ({a.country})<br />
                  Altitude: {a.altitude != null ? Math.round(a.altitude) + " m" : "unknown"}<br />
                  Speed: {a.velocity != null ? Math.round(a.velocity) + " m/s" : "unknown"}<br />
                  Heading: {a.heading != null ? Math.round(a.heading) + "°" : "unknown"}<br />
                  Last contact: {a.lastContact ? new Date(a.lastContact * 1000).toLocaleTimeString() : "unknown"}
                  {stale && <><br /><i>Data may be outdated</i></>}
                </Popup>
              </Marker>
            );
          })}

          {selectedId && aircraft[selectedId]?.trail?.length > 1 && (
            <Polyline
              positions={aircraft[selectedId].trail}
              pathOptions={{ color: "#ff3333", weight: 3 }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
