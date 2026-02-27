import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabase';

function MapController({ centerPos }) {
    const map = useMap();
    React.useEffect(() => {
        if (centerPos) {
            map.setView(centerPos, map.getZoom());
        }
    }, [centerPos, map]);
    return null;
}

export default function MapView({ users, currentUser, myPos, myState, centerMapTo, onOpenChat }) {
    const getMarkerIcon = (u) => {
        const isMe = u.id === currentUser.id;
        let colorClass = 'marker-green';

        if (isMe) {
            if (myState === 'needs_help') {
                const hasAttendant = users.some((o) => o.attending_to === u.id);
                colorClass = hasAttendant ? 'marker-flash-red' : 'marker-red';
            } else if (myState === 'attending') {
                colorClass = 'marker-flash-green';
            } else {
                colorClass = 'marker-blue';
            }
        } else {
            if (u.state === 'needs_help') {
                const hasAttendant = users.some((o) => o.attending_to === u.id);
                colorClass = hasAttendant ? 'marker-flash-red' : 'marker-red';
            } else if (u.state === 'attending') {
                colorClass = 'marker-flash-green';
            } else {
                colorClass = 'marker-green';
            }
        }

        return new L.DivIcon({
            className: `marker-icon ${colorClass}`,
            iconSize: [20, 20],
        });
    };

    const handleAttend = async (strandedUserId) => {
        await supabase
            .from('profiles')
            .update({ state: 'attending', attending_to: strandedUserId })
            .eq('id', currentUser.id);
    };

    const handleCancelAttend = async () => {
        await supabase
            .from('profiles')
            .update({ state: 'normal', attending_to: null })
            .eq('id', currentUser.id);
    };

    const visibleUsers = users.filter(
        (u) => u.visible || u.id === currentUser.id
    );

    return (
        <div className="map-container">
            <MapContainer
                center={myPos}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController centerPos={centerMapTo} />

                {visibleUsers.map((u) => {
                    if (!u.lat || !u.lon) return null;
                    const icon = getMarkerIcon(u);

                    return (
                        <Marker
                            key={`${u.id}-${icon.options.className}`}
                            position={[u.lat, u.lon]}
                            icon={icon}
                        >
                            <Popup>
                                <div className="popup-details">
                                    <h3>{u.username}</h3>
                                    {u.name && <p className="popup-name">{u.name}</p>}
                                    <p>
                                        <strong>Vehicle:</strong> {u.vehicle_type}
                                    </p>
                                    {u.cb_channel && (
                                        <p>
                                            <strong>CB:</strong> Ch {u.cb_channel}
                                        </p>
                                    )}
                                    {u.modifications && (
                                        <p>
                                            <strong>Mods:</strong> {u.modifications}
                                        </p>
                                    )}
                                    {u.rescue_rig && (
                                        <p className="rescue-badge">🚨 Rescue Rig</p>
                                    )}

                                    {/* Attend button — only if this user needs help and I'm not already attending */}
                                    {u.id !== currentUser.id &&
                                        u.state === 'needs_help' &&
                                        myState !== 'attending' && (
                                            <button
                                                className="popup-btn attend-btn"
                                                onClick={() => handleAttend(u.id)}
                                            >
                                                I'm Attending
                                            </button>
                                        )}

                                    {/* Cancel attending — if I'm attending this specific user */}
                                    {myState === 'attending' &&
                                        currentUser.attending_to === u.id && (
                                            <button
                                                className="popup-btn cancel-btn"
                                                onClick={handleCancelAttend}
                                            >
                                                Cancel Attending
                                            </button>
                                        )}

                                    {/* Message button for other users */}
                                    {u.id !== currentUser.id && (
                                        <button
                                            className="popup-btn message-btn"
                                            onClick={() => onOpenChat?.(u.id)}
                                        >
                                            💬 Message
                                        </button>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
