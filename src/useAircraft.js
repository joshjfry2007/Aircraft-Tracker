
import { useState, useEffect, useRef } from "react";
import { toFetchStates } from "./api";

const POLL_MS = 15000;
const MAX_DELAY = 120000;
const KEEP_FOR_S = 120;
const MAX_TRAIL = 20;

export function useAircraft(bbox, useSample = false) {
    const [aircraft, setAircraft] = useState({});
    const [status, setStatus] = useState({
        error: null,
        lastUpdated: null
    });

    const delayRef = useRef(POLL_MS);

    useEffect(() => {
        let timeoutId;
        let cancelled = false;

        setAircraft({});
        setStatus({ error: null, lastUpdated: null });
        delayRef.current = POLL_MS;

        async function poll() {
            try {
                const res = await toFetchStates(bbox, useSample);
                if (cancelled) return;

                const now = Date.now() / 1000;

                // merge aircraft, don't replace
                setAircraft((prev) => {
                    const next = {};
                    const seen = new Set();

                    for (const p of res) {
                        seen.add(p.id);

                        const old = prev[p.id];
                        const trail = old ? [...old.trail] : [];
                        const last = trail[trail.length - 1];

                        // if position changes
                        if (!last || last[0] !== p.lat || last[1] !== p.lon) {
                            trail.push([p.lat, p.lon]);
                        }

                        next[p.id] = {
                            ...p,
                            trail: trail.slice(-MAX_TRAIL),
                            seenAt: now
                        };
                    }

                    // keep temporarily missing aircraft
                    for (const [id, plane] of Object.entries(prev)) {
                        if (!seen.has(id) && now - plane.seenAt < KEEP_FOR_S) {
                            next[id] = plane;
                        }
                    }

                    return next;
                });

                // success: update status and reset delay
                setStatus({
                    error: null,
                    lastUpdated: Date.now()
                });

                delayRef.current = POLL_MS;

            } catch (error) {
                if (cancelled) return;

                // keep old aircraft and store the error
                setStatus((prev) => ({
                    ...prev,
                    error: error.message
                }));

                // double delay, maximum 2 minutes
                delayRef.current = Math.min(
                    delayRef.current * 2,
                    MAX_DELAY
                );
            }

            if (!cancelled) {
                timeoutId = setTimeout(poll, delayRef.current);
            }
        }

        poll();

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [bbox, useSample]);

    return { aircraft, status };
}
