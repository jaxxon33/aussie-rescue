import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore existing session on load
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        fetchProfile(s.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      // On first login after email verification, the auto-trigger created a
      // stub profile (just id + username). Fill in the rest from auth metadata.
      if (!data.vehicle_type) {
        const { data: { user } } = await supabase.auth.getUser();
        const meta = user?.user_metadata;
        if (meta && meta.vehicle_type) {
          const { data: updated } = await supabase
            .from('profiles')
            .update({
              name: meta.name || data.name,
              phone: meta.phone || data.phone,
              cb_channel: meta.cb_channel || data.cb_channel,
              vehicle_type: meta.vehicle_type,
              modifications: meta.modifications || data.modifications,
              url: meta.url || data.url,
              rescue_rig: meta.rescue_rig ?? data.rescue_rig,
            })
            .eq('id', userId)
            .select()
            .single();
          if (updated) {
            setProfile(updated);
            setLoading(false);
            return;
          }
        }
      }
      setProfile(data);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!session || !profile) {
    return <Auth onProfileReady={(p) => setProfile(p)} />;
  }

  return (
    <Dashboard
      currentUser={profile}
      onLogout={handleLogout}
      onProfileUpdate={setProfile}
    />
  );
}

export default App;
