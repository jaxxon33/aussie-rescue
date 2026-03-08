import React, { useState, useCallback, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { supabase } from '../supabase';
import useGeolocation from '../hooks/useGeolocation';
import useSupabaseRealtime from '../hooks/useSupabaseRealtime';
import useMessages from '../hooks/useMessages';
import useHelpAlerts from '../hooks/useHelpAlerts';
import MapView from './MapView';
import BottomControls from './BottomControls';
import ProfileModal from './ProfileModal';
import RescueRigsModal from './RescueRigsModal';
import MessagesModal from './MessagesModal';
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
  const [mapMode, setMapMode] = useState('street');

  // Modals
  const [showProfile, setShowProfile] = useState(false);
  const [showRigs, setShowRigs] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showHelpConfirm, setShowHelpConfirm] = useState(false);
  const [chatWithUserId, setChatWithUserId] = useState(null);

  // Toast notification for errors
  const [toast, setToast] = useState(null);

  // Online/offline detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── GPS with throttled DB writes ──
  const handlePositionUpdate = useCallback(
    async (lat, lon) => {
      const { error } = await supabase
        .from('profiles')
        .update({ lat, lon })
        .eq('id', currentUser.id);
      if (error) {
        console.error('GPS update failed:', error.message);
      }
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

  // ── Messages ──
  const {
    unreadCount,
    sendMessage,
    markAsRead,
    getConversations,
  } = useMessages(currentUser.id);

  // ── Help Alerts ──
  const { alerts, dismissAlert } = useHelpAlerts(users, currentUser.id);

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
      const { error } = await supabase
        .from('profiles')
        .update({ state: 'normal', attending_to: null })
        .eq('id', currentUser.id);
      if (error) {
        showToast('Failed to cancel help call. Try again.');
        return;
      }
      setMyState('normal');
      setAttendingTo(null);
    } else {
      setShowHelpConfirm(true);
    }
  };

  const confirmCallHelp = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ state: 'needs_help', attending_to: null })
      .eq('id', currentUser.id);
    if (error) {
      showToast('Failed to call for help. Try again.');
      return;
    }
    setMyState('needs_help');
    setAttendingTo(null);
    setShowHelpConfirm(false);
  };

  const cancelAttending = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ state: 'normal', attending_to: null })
      .eq('id', currentUser.id);
    if (error) {
      showToast('Failed to cancel attending. Try again.');
      return;
    }
    setMyState('normal');
    setAttendingTo(null);
  };

  const toggleVisibility = async () => {
    const newVal = !effectiveVisible;
    const { error } = await supabase
      .from('profiles')
      .update({ visible: newVal })
      .eq('id', currentUser.id);
    if (error) {
      showToast('Failed to update visibility. Try again.');
      return;
    }
    setVisible(newVal);
  };

  const handleOpenChat = (userId) => {
    setChatWithUserId(userId);
    setShowMessages(true);
  };

  const handleAlertClick = (alert) => {
    if (alert.lat && alert.lon) {
      setCenterMapTo([alert.lat, alert.lon]);
    }
    dismissAlert(alert.id);
  };

  const toggleMapMode = () => {
    setMapMode((prev) => (prev === 'street' ? 'satellite' : 'street'));
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

      {/* Toast Error Banner */}
      {toast && (
        <div className="toast-banner">
          <div>
            <strong>⚠️</strong> {toast}
          </div>
          <button className="dismiss-btn" onClick={() => setToast(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <span>📡</span>
          <span>You're offline — locations and messages won't update until connection is restored.</span>
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

      {/* Help Alert Banners — stacked properly */}
      {alerts.length > 0 && (
        <div className="help-alerts-container">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="help-alert-banner"
              onClick={() => handleAlertClick(alert)}
            >
              <div className="help-alert-content">
                <span className="help-alert-icon">🚨</span>
                <div>
                  <strong>{alert.username}</strong> needs emergency help!
                </div>
              </div>
              <button
                className="dismiss-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissAlert(alert.id);
                }}
              >
                ✕
              </button>
            </div>
          ))}
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
        mapMode={mapMode}
        centerMapTo={centerMapTo}
        onOpenChat={handleOpenChat}
        onError={showToast}
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
          mapMode={mapMode}
          unreadMessages={unreadCount}
          onToggleVisibility={toggleVisibility}
          onCallHelp={handleCallHelp}
          onCenter={handleCenter}
          onShowRigs={() => setShowRigs(true)}
          onShowMessages={() => {
            setChatWithUserId(null);
            setShowMessages(true);
          }}
          onToggleMapMode={toggleMapMode}
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

      {showMessages && (
        <MessagesModal
          conversations={getConversations(users)}
          users={users}
          currentUserId={currentUser.id}
          initialChatUserId={chatWithUserId}
          onSendMessage={sendMessage}
          onMarkAsRead={markAsRead}
          onClose={() => {
            setShowMessages(false);
            setChatWithUserId(null);
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
