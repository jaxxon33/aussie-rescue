import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook that watches for users calling for help and triggers
 * in-app + browser notifications.
 */
export default function useHelpAlerts(users, currentUserId) {
    const prevStatesRef = useRef({});
    const [alerts, setAlerts] = useState([]);
    const audioCtxRef = useRef(null);

    // Lazily create and reuse a single AudioContext
    const getAudioContext = () => {
        if (!audioCtxRef.current) {
            try {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            } catch {
                // Audio not supported
            }
        }
        // Resume if suspended (browsers auto-suspend after inactivity)
        if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => { });
        }
        return audioCtxRef.current;
    };

    // Clean up AudioContext on unmount
    useEffect(() => {
        return () => {
            if (audioCtxRef.current) {
                audioCtxRef.current.close().catch(() => { });
                audioCtxRef.current = null;
            }
        };
    }, []);

    // Watch for state changes to 'needs_help'
    useEffect(() => {
        const prev = prevStatesRef.current;

        users.forEach((user) => {
            if (user.id === currentUserId) return;
            const prevState = prev[user.id];

            // Only trigger on transition TO 'needs_help'
            if (user.state === 'needs_help' && prevState && prevState !== 'needs_help') {
                triggerAlert(user);
            }
        });

        // Save current states for next comparison
        const newStates = {};
        users.forEach((u) => {
            newStates[u.id] = u.state;
        });
        prevStatesRef.current = newStates;
    }, [users, currentUserId]);

    const triggerAlert = (user) => {
        const alert = {
            id: `${user.id}-${Date.now()}`,
            userId: user.id,
            username: user.username,
            lat: user.lat,
            lon: user.lon,
            timestamp: Date.now(),
        };

        setAlerts((prev) => [...prev, alert]);

        // Auto-dismiss after 15 seconds
        setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
        }, 15000);

        // Browser notification
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                showBrowserNotification(user);
            } else if (Notification.permission === 'default') {
                Notification.requestPermission().then((perm) => {
                    if (perm === 'granted') showBrowserNotification(user);
                });
            }
        }

        // Audio alert
        playAlertSound();
    };

    const showBrowserNotification = (user) => {
        try {
            new Notification('🚨 Rescue Alert — Aussie 4WD Rescue', {
                body: `${user.username} needs emergency help!`,
                tag: `help-${user.id}`,
                requireInteraction: true,
            });
        } catch (e) {
            console.warn('Browser notification failed:', e);
        }
    };

    const playAlertSound = () => {
        const ctx = getAudioContext();
        if (!ctx) return;

        try {
            // Play two quick alert beeps
            [0, 0.3].forEach((delay) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
                gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.2);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + 0.2);
            });
        } catch (e) {
            // Audio playback failed
        }
    };

    const dismissAlert = useCallback((alertId) => {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }, []);

    return { alerts, dismissAlert };
}
