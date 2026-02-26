import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function Auth({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);

    // Login State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Register State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cbChannel, setCbChannel] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [modifications, setModifications] = useState('');
    const [url, setUrl] = useState('');
    const [rescueRig, setRescueRig] = useState(false);


    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (isLogin) {
                // Find existing user directly in Supabase table
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('username', username)
                    .eq('password', password)
                    .single();

                if (error || !data) {
                    alert('Invalid credentials');
                    return;
                }
                onLogin(data);
            } else {
                // Insert new user to Supabase
                const { data, error } = await supabase
                    .from('users')
                    .insert([
                        {
                            username,
                            password, // Note: Use Supabase Auth for real production apps
                            name,
                            phone,
                            cbchannel: cbChannel,
                            vehicletype: vehicleType,
                            modifications,
                            url,
                            rescuerig: rescueRig,
                            state: 'normal',
                            visible: true
                        }
                    ])
                    .select()
                    .single();

                if (error) {
                    if (error.code === '23505') {
                        alert('Username already exists');
                    } else {
                        alert(error.message);
                    }
                    return;
                }
                onLogin(data);
            }
        } catch (err) {
            alert('Network error. Check connection.');
        }
    };

    return (
        <div className="auth-container">
            <div className="gui-panel">
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: 'var(--primary)' }}>
                    Aussie 4WD Rescue
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Username (Email)</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>

                    {!isLogin && (
                        <>
                            <div className="input-group">
                                <label>Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div className="input-group">
                                <label>Phone Number</label>
                                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label>CB Channel</label>
                                <input type="number" value={cbChannel} onChange={e => setCbChannel(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label>Vehicle Type</label>
                                <input type="text" value={vehicleType} onChange={e => setVehicleType(e.target.value)} placeholder="e.g. 79 Series Landcruiser" required />
                            </div>
                            <div className="input-group">
                                <label>Modifications</label>
                                <input type="text" value={modifications} onChange={e => setModifications(e.target.value)} placeholder="Winch, 35s, Lockers..." />
                            </div>
                            <div className="input-group">
                                <label>Website / YouTube URL</label>
                                <input type="text" value={url} onChange={e => setUrl(e.target.value)} />
                            </div>
                            <div className="checkbox-group">
                                <input type="checkbox" id="rescue" checked={rescueRig} onChange={e => setRescueRig(e.target.checked)} />
                                <label htmlFor="rescue">I have a Rescue Rig (capable of recoveries)</label>
                            </div>
                        </>
                    )}

                    <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
                </form>
                <span className="toggle-link" onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? "Don't have an account? Register" : "Already registered? Login"}
                </span>
            </div>
        </div>
    );
}
