import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for GPS tracking with throttled updates.
 * Only fires onPositionUpdate when enough time has passed
 * OR the user has moved a minimum distance, saving API calls.
 */
export default function useGeolocation(onPositionUpdate, options = {}) {
    const {
        throttleMs = 5000,
        minDistanceMeters = 10,
    } = options;

    const [position, setPosition] = useState(null);
    const [error, setError] = useState('');
    const watchIdRef = useRef(null);
    const lastUpdateRef = useRef({ time: 0, lat: 0, lon: 0 });
    const callbackRef = useRef(onPositionUpdate);

    // Keep callback ref in sync without triggering re-subscribe
    useEffect(() => {
        callbackRef.current = onPositionUpdate;
    }, [onPositionUpdate]);

    const haversineMeters = (lat1, lon1, lat2, lon2) => {
        const p = Math.PI / 180;
        const c = Math.cos;
        const a =
            0.5 -
            c((lat2 - lat1) * p) / 2 +
            c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
        return 12742000 * Math.asin(Math.sqrt(a)); // metres
    };

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setPosition([latitude, longitude]);
                setError('');

                const now = Date.now();
                const last = lastUpdateRef.current;
                const timeDiff = now - last.time;
                const distDiff = haversineMeters(last.lat, last.lon, latitude, longitude);

                if (timeDiff > throttleMs || distDiff > minDistanceMeters) {
                    lastUpdateRef.current = { time: now, lat: latitude, lon: longitude };
                    callbackRef.current?.(latitude, longitude);
                }
            },
            (err) => {
                console.error('Geolocation error:', err);
                setError(err.message || 'Unable to access GPS location.');
            },
            { enableHighAccuracy: true, maximumAge: 0 }
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []); // subscribe once on mount

    const dismissError = useCallback(() => setError(''), []);

    return { position, error, dismissError };
}
