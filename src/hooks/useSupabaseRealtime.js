import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

/**
 * Subscribes to real-time changes on the `profiles` table
 * and keeps a local users array in sync.
 */
export default function useSupabaseRealtime(currentUserId) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('profiles').select('*');
            if (!error && data) setUsers(data);
        } catch (e) {
            console.error('Error fetching profiles:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();

        const channel = supabase
            .channel('public:profiles')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles' },
                (payload) => {
                    setUsers((prev) => {
                        if (!prev.some((u) => u.id === payload.new.id)) {
                            fetchUsers(); // new user appeared, full refresh
                            return prev;
                        }
                        return prev.map((u) =>
                            u.id === payload.new.id ? payload.new : u
                        );
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'profiles' },
                (payload) => {
                    setUsers((prev) => [...prev, payload.new]);
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'profiles' },
                (payload) => {
                    setUsers((prev) => prev.filter((u) => u.id !== payload.old.id));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, fetchUsers]);

    return { users, loading, refetch: fetchUsers };
}
