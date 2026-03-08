import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';

const MAX_MESSAGE_LENGTH = 1000;

/**
 * Hook for managing direct messages between users.
 * Subscribes to real-time message inserts/updates.
 */
export default function useMessages(currentUserId) {
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesRef = useRef(messages);

    // Keep messagesRef in sync without triggering re-renders
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const fetchMessages = useCallback(async () => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Failed to fetch messages:', error.message);
            return;
        }

        if (data) {
            setMessages(data);
            setUnreadCount(
                data.filter((m) => m.recipient_id === currentUserId && !m.read).length
            );
        }
    }, [currentUserId]);

    useEffect(() => {
        fetchMessages();

        const channel = supabase
            .channel('user-messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const msg = payload.new;
                    // Only add if it involves the current user
                    if (
                        msg.sender_id === currentUserId ||
                        msg.recipient_id === currentUserId
                    ) {
                        setMessages((prev) => {
                            if (prev.some((m) => m.id === msg.id)) return prev;
                            return [...prev, msg];
                        });
                        if (msg.recipient_id === currentUserId && !msg.read) {
                            setUnreadCount((prev) => prev + 1);
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages' },
                (payload) => {
                    setMessages((prev) =>
                        prev.map((m) => (m.id === payload.new.id ? payload.new : m))
                    );
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [currentUserId, fetchMessages]);

    const lastSendRef = useRef(0);

    const sendMessage = useCallback(
        async (recipientId, content) => {
            // Client-side rate limiting (throttle)
            const now = Date.now();
            if (now - lastSendRef.current < 2000) {
                return { data: null, error: { message: 'Sending too fast. Slow down, mate.' } };
            }

            // Enforce length limit
            const trimmed = content.trim().slice(0, MAX_MESSAGE_LENGTH);
            if (!trimmed) return { data: null, error: { message: 'Message is empty' } };

            lastSendRef.current = now;

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    sender_id: currentUserId,
                    recipient_id: recipientId,
                    content: trimmed,
                })
                .select()
                .single();

            if (error) {
                console.error('Failed to send message:', error.message);
                lastSendRef.current = 0; // reset on error so they can try again
            } else if (data) {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === data.id)) return prev;
                    return [...prev, data];
                });
            }

            return { data, error };
        },
        [currentUserId]
    );

    const markAsRead = useCallback(
        async (otherUserId) => {
            // Use ref to avoid depending on messages state
            const currentMessages = messagesRef.current;
            const unreadIds = currentMessages
                .filter(
                    (m) =>
                        m.sender_id === otherUserId &&
                        m.recipient_id === currentUserId &&
                        !m.read
                )
                .map((m) => m.id);

            if (unreadIds.length === 0) return;

            const { error } = await supabase
                .from('messages')
                .update({ read: true })
                .in('id', unreadIds);

            if (error) {
                console.error('Failed to mark messages as read:', error.message);
                return;
            }

            setMessages((prev) =>
                prev.map((m) =>
                    unreadIds.includes(m.id) ? { ...m, read: true } : m
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - unreadIds.length));
        },
        [currentUserId] // No longer depends on `messages` — uses ref instead
    );

    const getConversations = useCallback(
        (users) => {
            const convos = {};
            messages.forEach((msg) => {
                const otherId =
                    msg.sender_id === currentUserId
                        ? msg.recipient_id
                        : msg.sender_id;
                if (!convos[otherId]) convos[otherId] = { messages: [], unread: 0 };
                convos[otherId].messages.push(msg);
                if (msg.recipient_id === currentUserId && !msg.read) {
                    convos[otherId].unread++;
                }
            });

            // Enrich with user data and sort by latest message
            return Object.entries(convos)
                .map(([userId, data]) => {
                    const user = users.find((u) => u.id === userId);
                    const lastMsg = data.messages[data.messages.length - 1];
                    return {
                        userId,
                        username: user?.username || 'Unknown',
                        name: user?.name || '',
                        lastMessage: lastMsg?.content || '',
                        lastTime: lastMsg?.created_at || '',
                        unread: data.unread,
                        messages: data.messages,
                    };
                })
                .sort(
                    (a, b) => new Date(b.lastTime) - new Date(a.lastTime)
                );
        },
        [messages, currentUserId]
    );

    return {
        messages,
        unreadCount,
        sendMessage,
        markAsRead,
        getConversations,
        refetch: fetchMessages,
    };
}
