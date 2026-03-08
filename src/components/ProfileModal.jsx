import React, { useState } from 'react';
import { supabase } from '../supabase';
import LoadingSpinner from './LoadingSpinner';

const MAX_USERNAME = 40;
const MAX_NAME = 80;
const MAX_PHONE = 20;
const MAX_VEHICLE = 100;
const MAX_MODS = 200;
const MAX_URL = 250;

function isValidUrl(str) {
    if (!str || !str.trim()) return true; // optional field
    try {
        const url = new URL(str);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
}

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

        if (form.username.trim().length < 2) {
            setError('Username must be at least 2 characters.');
            return;
        }

        if (!isValidUrl(form.url)) {
            setError('URL must start with http:// or https://');
            return;
        }

        setSaving(true);
        setError('');

        // Explicitly specify only the allowed profile fields
        const { data, error: updateError } = await supabase
            .from('profiles')
            .update({
                username: form.username.trim(),
                name: form.name.trim(),
                phone: form.phone.trim(),
                cb_channel: form.cb_channel,
                vehicle_type: form.vehicle_type.trim(),
                modifications: form.modifications.trim(),
                url: form.url.trim(),
                rescue_rig: form.rescue_rig,
            })
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
                        maxLength={MAX_USERNAME}
                    />
                </div>
                <div className="input-group">
                    <label>Full Name</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        maxLength={MAX_NAME}
                    />
                </div>
                <div className="input-group">
                    <label>Phone</label>
                    <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        maxLength={MAX_PHONE}
                    />
                </div>
                <div className="input-group">
                    <label>CB Channel</label>
                    <input
                        type="number"
                        value={form.cb_channel}
                        onChange={(e) => handleChange('cb_channel', e.target.value)}
                        min="1"
                        max="80"
                    />
                </div>
                <div className="input-group">
                    <label>Vehicle Type</label>
                    <input
                        type="text"
                        value={form.vehicle_type}
                        onChange={(e) => handleChange('vehicle_type', e.target.value)}
                        maxLength={MAX_VEHICLE}
                    />
                </div>
                <div className="input-group">
                    <label>Modifications</label>
                    <input
                        type="text"
                        value={form.modifications}
                        onChange={(e) => handleChange('modifications', e.target.value)}
                        maxLength={MAX_MODS}
                    />
                </div>
                <div className="input-group">
                    <label>Website / YouTube URL</label>
                    <input
                        type="url"
                        value={form.url}
                        onChange={(e) => handleChange('url', e.target.value)}
                        placeholder="https://..."
                        maxLength={MAX_URL}
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
