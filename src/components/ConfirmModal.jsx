import React from 'react';

export default function ConfirmModal({
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    danger = false,
}) {
    return (
        <div className="app-modal" onClick={onCancel}>
            <div className="gui-panel confirm-panel" onClick={(e) => e.stopPropagation()}>
                <h3 style={{ color: danger ? 'var(--danger)' : 'var(--primary)' }}>
                    {title}
                </h3>
                <p
                    style={{
                        margin: '0.75rem 0 1.5rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.6,
                        fontSize: '0.9rem',
                    }}
                >
                    {message}
                </p>
                <div className="confirm-actions">
                    <button className="btn-secondary" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button className={danger ? 'danger' : ''} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
