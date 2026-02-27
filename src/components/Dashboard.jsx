import React, { useState, useCallback } from 'react';
import { User as UserIcon } from 'lucide-react';
import { supabase } from '../supabase';
import useGeolocation from '../hooks/useGeolocation';
import useSupabaseRealtime from '../hooks/useSupabaseRealtime';
import MapView from './MapView';
import BottomControls from './BottomControls';
import ProfileModal from './ProfileModal';
import RescueRigsModal from './RescueRigsModal';
import ConfirmModal from './ConfirmModal';
import LoadingSpinner from './LoadingSpinner';

const DEFAULT_POS = [-25.2744, 133.7751]; // Centre of Australia

export default function Dashboard({ currentUser, onLogout, onProfileUpdate }) {
  const [centerMapTo, setCenterMapTo] = useState(null);
  const [visible, setVisible] = useState(currentUser.visible !== false);
  const [myState, setMyState] = useState(currentUser.state || 'normal');
  const [attendingTo, setAttendingTo] = useState(
    currentUser.attending_to || null
  );

  // Modals
  const [showProfile, setShowProfile] = useState(false);
  const [showRigs, setShowRigs] = useState(false);
  const [showHelpConfirm, setShowHelpConfirm] = useState(false);

  // ── GPS with throttled DB writes ──
  const handlePositionUpdate = useCallback(
    async (lat, lon) => {
      await supabase
        .from('profiles')
        .update({ lat, lon })
        .eq('id', currentUser.id);
    },
    [currentUser.id]
  );

  const {
    position,
    error: geoError,
    dismissError: dismissGeoError,
  } = useGeolocation(handlePositionUpdate, {
    throttleMs: 5000,
    minDistanceMeters: 10,
  });

  const myPos = position || DEFAULT_POS;

  // ── Realtime ──
  const { users, loading } = useSupabaseRealtime(currentUser.id);

  // Derive effective state from real-time data
  const myRealtimeData = users.find((u) => u.id === currentUser.id);
  const effectiveState = myRealtimeData?.state || myState;
  const effectiveVisible = myRealtimeData?.visible ?? visible;
  const effectiveAttendingTo = myRealtimeData?.attending_to || attendingTo;

  // Find who I'm attending (for the banner)
  const attendingUser =
    effectiveAttendingTo && effectiveState === 'attending'
      ? users.find((u) => u.id === effectiveAttendingTo)
      : null;

  // ── Actions ──
  const handleCenter = () => {
    if (position) {
      setCenterMapTo([...position]);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenterMapTo([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  };

  const handleCallHelp = async () => {
    if (effectiveState === 'needs_help') {
      // Cancel distress
      await supabase
        .from('profiles')
        .update({ state: 'normal', attending_to: null })
        .eq('id', currentUser.id);
      setMyState('normal');
      setAttendingTo(null);
    } else if (effectiveState === 'attending') {
      // Cancel attending first, then call help
      setShowHelpConfirm(true);
    } else {
      setShowHelpConfirm(true);
    }
  };

  const confirmCallHelp = async () => {
    await supabase
      .from('profiles')
      .update({ state: 'needs_help', attending_to: null })
      .eq('id', currentUser.id);
    setMyState('needs_help');
    setAttendingTo(null);
    setShowHelpConfirm(false);
  };

  const cancelAttending = async () => {
    await supabase
      .from('profiles')
      .update({ state: 'normal', attending_to: null })
      .eq('id', currentUser.id);
    setMyState('normal');
    setAttendingTo(null);
  };

  const toggleVisibility = async () => {
    const newVal = !effectiveVisible;
    await supabase
      .from('profiles')
      .update({ visible: newVal })
      .eq('id', currentUser.id);
    setVisible(newVal);
  };

  // ── Render ──
  if (loading && users.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* GPS Error Banner */}
      {geoError && (
        <div className="gps-error-banner">
          <div>
            <strong>GPS Error:</strong> {geoError}
          </div>
          <button className="dismiss-btn" onClick={dismissGeoError}>
            ✕
          </button>
        </div>
      )}

      {/* Attending Banner */}
      {effectiveState === 'attending' && attendingUser && (
        <div className="attending-banner">
          <div>
            🚗 Heading to <strong>{attendingUser.username}</strong>
          </div>
          <button onClick={cancelAttending}>Cancel</button>
        </div>
      )}

      {/* Map */}
      <MapView
        users={users}
        currentUser={{
          ...currentUser,
          attending_to: effectiveAttendingTo,
        }}
        myPos={myPos}
        myState={effectiveState}
        centerMapTo={centerMapTo}
      />

      {/* Overlay UI */}
      <div className="app-overlay">
        <div className="top-bar">
          <div
            className="status-badge"
            onClick={() => setShowProfile(true)}
            style={{ cursor: 'pointer' }}
          >
            <UserIcon size={16} />
            {currentUser.username}
            {effectiveState === 'needs_help' && (
              <span className="help-tag">HELP</span>
            )}
            {effectiveState === 'attending' && (
              <span className="attending-tag">ATTENDING</span>
            )}
          </div>
          <button className="btn-logout" onClick={onLogout}>
            Logout
          </button>
        </div>

        <BottomControls
          visible={effectiveVisible}
          myState={effectiveState}
          onToggleVisibility={toggleVisibility}
          onCallHelp={handleCallHelp}
          onCenter={handleCenter}
          onShowRigs={() => setShowRigs(true)}
        />
      </div>

      {/* Modals */}
      {showRigs && (
        <RescueRigsModal
          users={users}
          currentUser={currentUser}
          myPos={myPos}
          onClose={() => setShowRigs(false)}
        />
      )}

      {showProfile && (
        <ProfileModal
          profile={currentUser}
          onClose={() => setShowProfile(false)}
          onUpdate={(updated) => {
            onProfileUpdate(updated);
            setShowProfile(false);
          }}
        />
      )}

      {showHelpConfirm && (
        <ConfirmModal
          title="Call for Help"
          message="Are you sure you need emergency rescue? This will alert all nearby vehicles and mark your location on the map."
          confirmText="Yes, Call for Help"
          cancelText="Cancel"
          danger
          onConfirm={confirmCallHelp}
          onCancel={() => setShowHelpConfirm(false)}
        />
      )}
    </div>
  );
}
