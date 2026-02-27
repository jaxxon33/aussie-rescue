import React, { useState } from 'react';
import { supabase } from '../supabase';
import LoadingSpinner from './LoadingSpinner';

export default function Auth({ onProfileReady }) {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pendingVerification, setPendingVerification] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');

    // Shared
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Register-only
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cbChannel, setCbChannel] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [modifications, setModifications] = useState('');
    const [url, setUrl] = useState('');
    const [rescueRig, setRescueRig] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                // ── Login with Supabase Auth ──
                const { data, error: authError } =
                    await supabase.auth.signInWithPassword({ email, password });

                if (authError) {
                    setError(authError.message);
                    setLoading(false);
                    return;
                }

                // Fetch profile
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profileError || !profile) {
                    setError('Profile not found. Please register first.');
                    setLoading(false);
                    return;
                }

                onProfileReady(profile);
            } else {
                // ── Register with Supabase Auth ──
                const { data, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username,
                            name,
                            phone,
                            cb_channel: cbChannel,
                            vehicle_type: vehicleType,
                            modifications,
                            url,
                            rescue_rig: rescueRig,
                        },
                    },
                });

                if (authError) {
                    setError(authError.message);
                    setLoading(false);
                    return;
                }

                // If email confirmation is enabled, the session will be null
                // until the user verifies their email.
                if (!data.session) {
                    setVerificationEmail(email);
                    setPendingVerification(true);
                    setLoading(false);
                    return;
                }

                // If email confirmation is disabled, we get a session immediately
                // — create the profile and proceed.
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        username,
                        name,
                        phone,
                        cb_channel: cbChannel,
                        vehicle_type: vehicleType,
                        modifications,
                        url,
                        rescue_rig: rescueRig,
                        state: 'normal',
                        visible: true,
                    })
                    .select()
                    .single();

                if (profileError) {
                    if (profileError.code === '23505') {
                        setError('Username already taken. Please choose another.');
                    } else {
                        setError(profileError.message);
                    }
                    setLoading(false);
                    return;
                }

                onProfileReady(profile);
            }
        } catch (err) {
            setError('Network error. Check your connection.');
        }

        setLoading(false);
    };

    // ── Verification pending screen ──
    if (pendingVerification) {
        return (
            <div className="auth-container">
                <div className="gui-panel auth-panel">
                    <div className="auth-header">
                        <div className="auth-icon">📧</div>
                        <h2>Check Your Inbox</h2>
                        <p className="auth-subtitle">
                            We've sent a verification link to
                        </p>
                    </div>
                    <div className="verification-email">{verificationEmail}</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, textAlign: 'center', marginBottom: '1.5rem' }}>
                        Click the link in the email to verify your account, then come back here to log in.
                    </p>
                    <button onClick={() => {
                        setPendingVerification(false);
                        setIsLogin(true);
                        setError('');
                    }}>
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="gui-panel auth-panel">
                <div className="auth-header">
                    <div className="auth-icon">🚙</div>
                    <h2>Aussie 4WD Rescue</h2>
                    <p className="auth-subtitle">
                        {isLogin ? 'Welcome back, mate' : 'Join the convoy'}
                    </p>
                </div>

                {error && (
                    <div className="error-banner">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    {!isLogin && (
                        <>
                            <div className="input-group">
                                <label>Username (public display name)</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="OutbackDave"
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Phone Number</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <label>CB Channel</label>
                                <input
                                    type="number"
                                    value={cbChannel}
                                    onChange={(e) => setCbChannel(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <label>Vehicle Type</label>
                                <input
                                    type="text"
                                    value={vehicleType}
                                    onChange={(e) => setVehicleType(e.target.value)}
                                    placeholder="e.g. 79 Series Landcruiser"
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Modifications</label>
                                <input
                                    type="text"
                                    value={modifications}
                                    onChange={(e) => setModifications(e.target.value)}
                                    placeholder="Winch, 35s, Lockers..."
                                />
                            </div>
                            <div className="input-group">
                                <label>Website / YouTube URL</label>
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                            </div>
                            <div className="checkbox-group">
                                <input
                                    type="checkbox"
                                    id="rescue"
                                    checked={rescueRig}
                                    onChange={(e) => setRescueRig(e.target.checked)}
                                />
                                <label htmlFor="rescue">
                                    I have a Rescue Rig (capable of recoveries)
                                </label>
                            </div>
                        </>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? <LoadingSpinner /> : isLogin ? 'Login' : 'Register'}
                    </button>
                </form>

                <span
                    className="toggle-link"
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setError('');
                    }}
                >
                    {isLogin
                        ? "Don't have an account? Register"
                        : 'Already registered? Login'}
                </span>
            </div>
        </div>
    );
}
