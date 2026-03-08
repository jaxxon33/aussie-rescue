import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react';

const MAX_MESSAGE_LENGTH = 1000;

export default function MessagesModal({
    conversations,
    users,
    currentUserId,
    initialChatUserId,
    onSendMessage,
    onMarkAsRead,
    onClose,
}) {
    const [chatUserId, setChatUserId] = useState(initialChatUserId || null);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const chatUser = chatUserId ? users.find((u) => u.id === chatUserId) : null;
    const activeConvo = chatUserId
        ? conversations.find((c) => c.userId === chatUserId)
        : null;
    const chatMessages = activeConvo?.messages || [];

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages.length]);

    // Mark messages as read when opening a chat
    useEffect(() => {
        if (chatUserId) {
            onMarkAsRead(chatUserId);
        }
    }, [chatUserId, chatMessages.length, onMarkAsRead]);

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = messageText.trim();
        if (!trimmed || !chatUserId || sending) return;
        if (trimmed.length > MAX_MESSAGE_LENGTH) return;

        setSending(true);
        await onSendMessage(chatUserId, trimmed);
        setMessageText('');
        setSending(false);
    };

    const handleMessageChange = (e) => {
        const value = e.target.value;
        if (value.length <= MAX_MESSAGE_LENGTH) {
            setMessageText(value);
        }
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    };

    const charCountClass = messageText.length >= MAX_MESSAGE_LENGTH
        ? 'char-count at-limit'
        : messageText.length >= MAX_MESSAGE_LENGTH * 0.9
            ? 'char-count near-limit'
            : 'char-count';

    // ── Chat View ──
    if (chatUserId) {
        return (
            <div className="app-modal" onClick={onClose}>
                <div
                    className="gui-panel messages-panel"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="chat-header">
                        <button
                            className="chat-back-btn"
                            onClick={() => setChatUserId(null)}
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="chat-user-info">
                            <strong>{chatUser?.username || 'Unknown'}</strong>
                            {chatUser?.vehicle_type && (
                                <span className="chat-vehicle">{chatUser.vehicle_type}</span>
                            )}
                        </div>
                    </div>

                    <div className="chat-messages">
                        {chatMessages.length === 0 && (
                            <p className="chat-empty">
                                No messages yet. Say g'day! 👋
                            </p>
                        )}
                        {chatMessages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`chat-bubble ${msg.sender_id === currentUserId ? 'sent' : 'received'
                                    }`}
                            >
                                <p>{msg.content}</p>
                                <span className="chat-time">{formatTime(msg.created_at)}</span>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-bar" onSubmit={handleSend}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={messageText}
                                onChange={handleMessageChange}
                                maxLength={MAX_MESSAGE_LENGTH}
                                autoFocus
                            />
                            {messageText.length > 0 && (
                                <span className={charCountClass}>
                                    {messageText.length}/{MAX_MESSAGE_LENGTH}
                                </span>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={!messageText.trim() || sending || messageText.length > MAX_MESSAGE_LENGTH}
                            className="chat-send-btn"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ── Conversations List ──
    return (
        <div className="app-modal" onClick={onClose}>
            <div
                className="gui-panel messages-panel"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
                    💬 Messages
                </h3>

                {conversations.length === 0 ? (
                    <p
                        style={{
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                            padding: '2rem 0',
                            fontSize: '0.9rem',
                        }}
                    >
                        No messages yet. Tap "Message" on a vehicle's marker to start a
                        conversation.
                    </p>
                ) : (
                    <div className="convo-list">
                        {conversations.map((convo) => (
                            <div
                                key={convo.userId}
                                className="convo-item"
                                onClick={() => setChatUserId(convo.userId)}
                            >
                                <div className="convo-left">
                                    <div className="convo-username">
                                        {convo.username}
                                        {convo.unread > 0 && (
                                            <span className="convo-unread">{convo.unread}</span>
                                        )}
                                    </div>
                                    <p className="convo-preview">{convo.lastMessage}</p>
                                </div>
                                <span className="convo-time">{formatTime(convo.lastTime)}</span>
                            </div>
                        ))}
                    </div>
                )}

                <button style={{ marginTop: '1rem' }} onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
}
