import sample from "./fake_sample.json";

const BASE = "/api/states";

export async function toFetchStates({lamin, lomin, lamax, lomax}, useSample = false) {
    let data;
    if (useSample) {
        data = sample; // skip the network entirely
    } else {
        const res = await fetch(`${BASE}?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`);
        if (res.status === 429) throw new Error("Rate limited (429)");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
    }

    return (data.states ?? [])
        .filter((o) => o[5] != null && o[6] != null)
        .filter((o) => !useSample || (o[6] >= lamin && o[6] <= lamax && o[5] >= lomin && o[5] <= lomax))
        .map((o) => ({
            id: o[0],
            callsign: (o[1] || "").trim() || "N/A",
            country: o[2],
            lastContact: o[4],
            lon: o[5],
            lat: o[6],
            altitude: o[7],
            velocity: o[9],
            heading: o[10],
        }))
}