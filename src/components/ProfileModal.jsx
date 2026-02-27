import React, { useState } from 'react';
import { supabase } from '../supabase';
import LoadingSpinner from './LoadingSpinner';

export default function ProfileModal({ profile, onClose, onUpdate }) {
    const [form, setForm] = useState({
        username: profile.username || '',
        name: profile.name || '',
        phone: profile.phone || '',
        cb_channel: profile.cb_channel || '',
        vehicle_type: profile.vehicle_type || '',
        modifications: profile.modifications || '',
        url: profile.url || '',
        rescue_rig: profile.rescue_rig || false,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setSuccess(false);
        setError('');
    };

    const handleSave = async () => {
        if (!form.username.trim()) {
            setError('Username is required.');
            return;
        }

        setSaving(true);
        setError('');

        const { data, error: updateError } = await supabase
            .from('profiles')
            .update(form)
            .eq('id', profile.id)
            .select()
            .single();

        if (updateError) {
            if (updateError.code === '23505') {
                setError('Username already taken. Please choose another.');
            } else {
                setError(updateError.message);
            }
        } else {
            setSuccess(true);
            onUpdate(data);
        }

        setSaving(false);
    };

    return (
        <div className="app-modal" onClick={onClose}>
            <div
                className="gui-panel"
                onClick={(e) => e.stopPropagation()}
                style={{ maxHeight: '85vh', overflowY: 'auto' }}
            >
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
                    My Profile
                </h3>

                {error && (
                    <div className="error-banner">
                        <span>⚠️</span> {error}
                    </div>
                )}
                {success && (
                    <div className="success-banner">✓ Profile updated!</div>
                )}

                <div className="input-group">
                    <label>Username (public display name)</label>
                    <input
                        type="text"
                        value={form.username}
                        onChange={(e) => handleChange('username', e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label>Full Name</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label>Phone</label>
                    <input
                        type="text"
                        value={form.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label>CB Channel</label>
                    <input
                        type="number"
                        value={form.cb_channel}
                        onChange={(e) => handleChange('cb_channel', e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label>Vehicle Type</label>
                    <input
                        type="text"
                        value={form.vehicle_type}
                        onChange={(e) => handleChange('vehicle_type', e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label>Modifications</label>
                    <input
                        type="text"
                        value={form.modifications}
                        onChange={(e) => handleChange('modifications', e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label>Website / YouTube URL</label>
                    <input
                        type="text"
                        value={form.url}
                        onChange={(e) => handleChange('url', e.target.value)}
                    />
                </div>
                <div className="checkbox-group">
                    <input
                        type="checkbox"
                        id="edit-rescue"
                        checked={form.rescue_rig}
                        onChange={(e) => handleChange('rescue_rig', e.target.checked)}
                    />
                    <label htmlFor="edit-rescue">Rescue Rig (capable of recoveries)</label>
                </div>

                <div className="confirm-actions" style={{ marginTop: '1rem' }}>
                    <button className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                    <button onClick={handleSave} disabled={saving}>
                        {saving ? <LoadingSpinner /> : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
