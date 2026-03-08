import { describe, it, expect } from 'vitest';
import { calcDistKm, calcDistMeters } from './geo';

describe('geo utility', () => {
    // Known distance between Sydney and Melbourne is approx 713km
    const sydney = { lat: -33.8688, lon: 151.2093 };
    const melbourne = { lat: -37.8136, lon: 144.9631 };

    it('calculates distance between Sydney and Melbourne correctly', () => {
        const dist = calcDistKm(sydney.lat, sydney.lon, melbourne.lat, melbourne.lon);
        // Haversine formula gives ~713 km
        expect(dist).toBeGreaterThan(710);
        expect(dist).toBeLessThan(720);
    });

    it('calculates same point as zero distance', () => {
        const dist = calcDistKm(sydney.lat, sydney.lon, sydney.lat, sydney.lon);
        expect(dist).toBe(0);
    });

    it('calculates meters correctly', () => {
        const distKm = calcDistKm(sydney.lat, sydney.lon, melbourne.lat, melbourne.lon);
        const distM = calcDistMeters(sydney.lat, sydney.lon, melbourne.lat, melbourne.lon);
        expect(distM).toBe(distKm * 1000);
    });

    it('handles missing coordinates gracefully', () => {
        expect(calcDistKm(null, 1, 2, 3)).toBe(0);
        expect(calcDistKm(1, null, 2, 3)).toBe(0);
        expect(calcDistKm(1, 2, null, 3)).toBe(0);
        expect(calcDistKm(1, 2, 3, null)).toBe(0);
    });
});
