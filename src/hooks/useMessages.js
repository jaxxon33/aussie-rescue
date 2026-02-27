import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

/**
 * Hook for managing direct messages between users.
 * Subscribes to real-time message inserts/updates.
 */
export default function useMessages(currentUserId) {
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchMessages = useCallback(async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
            .order('created_at', { ascending: true });

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

    const sendMessage = useCallback(
        async (recipientId, content) => {
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    sender_id: currentUserId,
                    recipient_id: recipientId,
                    content: content.trim(),
                })
                .select()
                .single();

            if (data) {
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
            const unreadIds = messages
                .filter(
                    (m) =>
                        m.sender_id === otherUserId &&
                        m.recipient_id === currentUserId &&
                        !m.read
                )
                .map((m) => m.id);

            if (unreadIds.length === 0) return;

            await supabase
                .from('messages')
                .update({ read: true })
                .in('id', unreadIds);

            setMessages((prev) =>
                prev.map((m) =>
                    unreadIds.includes(m.id) ? { ...m, read: true } : m
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - unreadIds.length));
        },
        [messages, currentUserId]
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
