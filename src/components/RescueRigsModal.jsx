import React from 'react';
import { calcDistKm } from '../utils/geo';

export default function RescueRigsModal({ users, currentUser, myPos, onClose }) {

    const rescueRigs = users
        .filter((u) => u.rescue_rig && u.id !== currentUser.id && u.lat)
        .map((u) => ({
            ...u,
            dist: calcDistKm(myPos[0], myPos[1], u.lat, u.lon),
        }))
        .sort((a, b) => a.dist - b.dist);

    return (
        <div className="app-modal" onClick={onClose}>
            <div
                className="gui-panel"
                onClick={(e) => e.stopPropagation()}
                style={{ maxHeight: '80vh', overflowY: 'auto' }}
            >
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
                    🚨 Rescue Rigs Nearby
                </h3>

                {rescueRigs.length === 0 ? (
                    <p
                        style={{
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                            padding: '2rem 0',
                        }}
                    >
                        No rescue rigs found nearby.
                    </p>
                ) : (
                    rescueRigs.map((u) => (
                        <div key={u.id} className="rig-item">
                            <div className="rig-info">
                                <strong>{u.username}</strong>
                                {u.name && <span className="rig-name">{u.name}</span>}
                            </div>
                            <p className="rig-distance">{u.dist.toFixed(1)} km away</p>
                            <p className="rig-vehicle">{u.vehicle_type}</p>
                            {u.modifications && (
                                <p className="rig-mods">{u.modifications}</p>
                            )}
                        </div>
                    ))
                )}

                <button style={{ marginTop: '1rem' }} onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
}
