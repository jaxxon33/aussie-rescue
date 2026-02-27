import React from 'react';

export default function LoadingSpinner({ fullScreen = false }) {
    if (fullScreen) {
        return (
            <div className="loading-fullscreen">
                <div className="spinner" />
                <p>Loading Aussie Rescue…</p>
            </div>
        );
    }

    return <span className="spinner-inline" />;
}
