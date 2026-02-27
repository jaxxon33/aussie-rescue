import React from 'react';
import { LocateFixed, EyeOff, Eye, Search, AlertTriangle } from 'lucide-react';

export default function BottomControls({
    visible,
    myState,
    onToggleVisibility,
    onCallHelp,
    onCenter,
    onShowRigs,
}) {
    return (
        <div className="bottom-controls">
            <div
                className="fab"
                onClick={onShowRigs}
                style={{ background: 'var(--secondary)' }}
                title="Find Rescue Rigs"
            >
                <Search size={24} color="#fff" />
            </div>

            <div
                className="fab"
                onClick={onToggleVisibility}
                style={{ background: 'var(--card-bg)' }}
                title={visible ? 'Hide My Location' : 'Show My Location'}
            >
                {visible ? (
                    <Eye size={24} color="#fff" />
                ) : (
                    <EyeOff size={24} color="#aaa" />
                )}
            </div>

            <div
                className={`fab help ${myState === 'needs_help' ? 'active' : ''}`}
                onClick={onCallHelp}
                title={myState === 'needs_help' ? 'Cancel Help Call' : 'Call for Help'}
            >
                <AlertTriangle size={36} color="#fff" />
            </div>

            <div
                className="fab"
                onClick={onCenter}
                style={{ background: 'var(--secondary)' }}
                title="Centre Map on Me"
            >
                <LocateFixed size={24} color="#fff" />
            </div>
        </div>
    );
}
