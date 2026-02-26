import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LocateFixed, EyeOff, Eye, Search, User as UserIcon, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabase';

// Component to recenter map
function MapController({ centerPos }) {
  const map = useMap();
  useEffect(() => {
    if (centerPos) {
      map.setView(centerPos, map.getZoom());
    }
  }, [centerPos, map]);
  return null;
}

export default function Dashboard({ currentUser, onLogout }) {
  const [users, setUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [myPos, setMyPos] = useState([-25.2744, 133.7751]); // Default Aus center
  const [centerMapObj, setCenterMapObj] = useState(null);

  // UI states
  const [visible, setVisible] = useState(currentUser.visible === 1 || currentUser.visible === true);
  const [myState, setMyState] = useState(currentUser.state || 'normal'); // normal, needs_help, attending
  const [showRigs, setShowRigs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [locationError, setLocationError] = useState('');
  const watchIdRef = useRef(null);

  useEffect(() => {
    fetchUsers();

    // Subscribe to Supabase real-time
    const channel = supabase.channel('public:users')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
        setUsers(prev => {
          if (!prev.some(u => u.id === payload.new.id)) {
            fetchUsers();
            return prev;
          }
          return prev.map(u => u.id === payload.new.id ? payload.new : u);
        });

        // If the update was my own profile from another device/sync
        if (payload.new.id === currentUser.id) {
          setMyState(payload.new.state);
          setVisible(payload.new.visible);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload) => {
        setUsers(prev => [...prev, payload.new]);
      })
      .subscribe();

    // Start GPS Tracking
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocationError('');
          setMyPos([latitude, longitude]);
          // Sync location precisely to Supabase map database
          await supabase.from('users').update({ lat: latitude, lon: longitude }).eq('id', currentUser.id);
        },
        (err) => {
          console.error(err);
          setLocationError(err.message || 'Unable to access GPS location.');
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data) setUsers(data);
    } catch (e) { console.error('Error fetching users:', e); }
  };

  const handleCenter = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setCenterMapObj([pos.coords.latitude, pos.coords.longitude]);
      });
    } else {
      setCenterMapObj(myPos);
    }
  };

  const handleCallHelp = async () => {
    if (myState === 'needs_help') {
      await supabase.from('users').update({ state: 'normal', attendingto: null }).eq('id', currentUser.id);
      setMyState('normal');
    } else {
      if (window.confirm("Are you sure you need emergency rescue? This will alert all nearby vehicles.")) {
        await supabase.from('users').update({ state: 'needs_help', attendingto: null }).eq('id', currentUser.id);
        setMyState('needs_help');
      }
    }
  };

  const toggleVisibility = async () => {
    const newVal = !visible;
    await supabase.from('users').update({ visible: newVal }).eq('id', currentUser.id);
    setVisible(newVal);
  };

  const getMarkerIcon = (u) => {
    const isMe = u.id === currentUser.id;
    let colorClass = 'marker-green';

    if (isMe) {
      // My vehicle location = steady blue
      if (myState === 'normal') colorClass = 'marker-blue';
      // Stranded = steady red, or red flash if someone attending
      else if (myState === 'needs_help') {
        const hasAttendant = users.some(other => other.attendingto === u.id);
        colorClass = hasAttendant ? 'marker-flash-red' : 'marker-red';
      }
      else if (myState === 'attending') colorClass = 'marker-flash-green';
      else colorClass = 'marker-blue'; // Fallback for myself
    } else {
      if (u.state === 'normal') colorClass = 'marker-green';
      else if (u.state === 'needs_help') {
        const hasAttendant = users.some(other => other.attendingto === u.id);
        colorClass = hasAttendant ? 'marker-flash-red' : 'marker-red';
      }
      else if (u.state === 'attending') colorClass = 'marker-flash-green';
      else colorClass = 'marker-green'; // Fallback
    }

    return new L.DivIcon({
      className: `marker-icon ${colorClass}`,
      iconSize: [20, 20]
    });
  };

  // Distance calculator helper
  const calcDist = (lat1, lon1, lat2, lon2) => {
    const p = 0.017453292519943295;
    const c = Math.cos;
    const a = 0.5 - c((lat2 - lat1) * p) / 2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {locationError && (
        <div style={{
          position: 'absolute', top: 10, left: 10, right: 10, zIndex: 1000,
          background: 'var(--danger)', color: '#fff', padding: '1rem',
          borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <strong>GPS Error:</strong> {locationError}
          </div>
          <button style={{ width: 'auto', padding: '0.25rem 0.5rem', background: 'transparent', border: '1px solid #fff' }} onClick={() => setLocationError('')}>✕</button>
        </div>
      )}
      <div className="map-container">
        <MapContainer center={myPos} zoom={4} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController centerPos={centerMapObj} />

          {/* Render Markers */}
          {users.filter(u => u.visible === 1 || u.visible === true || u.id === currentUser.id).map(u => {
            if (!u.lat || !u.lon) return null;
            const icon = getMarkerIcon(u);

            // Jitter for local development stacking
            const jitterLat = (u.id.charCodeAt(0) % 10 - 5) * 0.0001;
            const jitterLon = (u.id.length > 1 ? u.id.charCodeAt(1) % 10 - 5 : 0) * 0.0001;

            return (
              <Marker key={`${u.id}-${icon.options.className}`} position={[u.lat + jitterLat, u.lon + jitterLon]} icon={icon}>
                <Popup>
                  <div className="popup-details">
                    <h3>{u.username}</h3>
                    <p><strong>Vehicle:</strong> {u.vehicletype}</p>
                    <p><strong>CB:</strong> {u.cbchannel}</p>
                    {u.id !== currentUser.id && u.state === 'needs_help' && (
                      <button
                        style={{ marginTop: '0.5rem' }}
                        onClick={async () => {
                          await supabase.from('users').update({ state: 'attending', attendingto: u.id }).eq('id', currentUser.id);
                        }}
                      >
                        I'm Attending
                      </button>
                    )}
                    {u.id !== currentUser.id && u.rescuerig && <p>🚨 Rescue Rig</p>}
                    <button style={{ marginTop: '0.5rem', background: 'transparent', border: '1px solid var(--primary)' }}>
                      Send Message
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="app-overlay">
        <div className="top-bar">
          <div className="status-badge" onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
            <UserIcon size={16} />
            {currentUser.username} {myState === 'needs_help' && '(HELP)'}
          </div>
          <button style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={onLogout}>Logout</button>
        </div>

        <div className="bottom-controls">
          <div className="fab" onClick={() => setShowRigs(true)} style={{ background: 'var(--secondary)' }}>
            <Search size={24} color="#fff" />
          </div>

          <div className="fab" onClick={toggleVisibility} style={{ background: 'var(--card-bg)' }}>
            {visible ? <Eye size={24} color="#fff" /> : <EyeOff size={24} color="#aaa" />}
          </div>

          <div className={`fab help ${myState === 'needs_help' ? 'active' : ''}`} onClick={handleCallHelp}>
            <AlertTriangle size={36} color="#fff" />
          </div>

          <div className="fab" onClick={handleCenter} style={{ background: 'var(--secondary)' }}>
            <LocateFixed size={24} color="#fff" />
          </div>
        </div>
      </div>

      {showRigs && (
        <div className="app-modal" onClick={() => setShowRigs(false)}>
          <div className="gui-panel" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Rescue Rigs Nearby</h3>
            {users
              .filter(u => u.rescuerig && u.id !== currentUser.id && u.lat)
              .map(u => ({ ...u, dist: calcDist(myPos[0], myPos[1], u.lat, u.lon) }))
              .sort((a, b) => a.dist - b.dist)
              .map(u => (
                <div key={u.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #333' }}>
                  <strong>{u.name} ({u.username})</strong>
                  <p style={{ fontSize: '0.8rem', color: '#aaa' }}>{u.dist.toFixed(1)} km away</p>
                  <p style={{ fontSize: '0.8rem' }}>{u.vehicletype}</p>
                </div>
              ))}
            {users.filter(u => u.rescuerig && u.id !== currentUser.id).length === 0 && <p>No rescue rigs found.</p>}
            <button style={{ marginTop: '1rem' }} onClick={() => setShowRigs(false)}>Close</button>
          </div>
        </div>
      )}

      {showProfile && (
        <div className="app-modal" onClick={() => setShowProfile(false)}>
          <div className="gui-panel" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>My Profile</h3>
            <div className="input-group"><label>Vehicle</label><p>{currentUser.vehicletype}</p></div>
            <div className="input-group"><label>CB</label><p>{currentUser.cbchannel}</p></div>
            <div className="input-group"><label>Mods</label><p>{currentUser.modifications || 'None'}</p></div>
            <button style={{ marginTop: '1rem' }} onClick={() => setShowProfile(false)}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
}
