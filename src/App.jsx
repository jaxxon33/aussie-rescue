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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      // Profile exists — if it's a stub (no vehicle_type), fill from auth metadata
      if (!data.vehicle_type) {
        const { data: { user } } = await supabase.auth.getUser();
        const meta = user?.user_metadata;
        if (meta && meta.vehicle_type) {
          const { data: updated } = await supabase
            .from('profiles')
            .update({
              username: meta.username || data.username,
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
    } else if (error) {
      // No profile exists yet — create one from auth metadata
      // (this happens on first login after email verification)
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata || {};
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: meta.username || user.email,
          name: meta.name || '',
          phone: meta.phone || '',
          cb_channel: meta.cb_channel || '',
          vehicle_type: meta.vehicle_type || '',
          modifications: meta.modifications || '',
          url: meta.url || '',
          rescue_rig: meta.rescue_rig || false,
          state: 'normal',
          visible: true,
        })
        .select()
        .single();
      if (newProfile) setProfile(newProfile);
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
