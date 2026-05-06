import { useState, useEffect } from 'react';
import { User } from '../types';

export function useUser() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('citylive_current_user');
        if (saved) {
            try {
                setUser(JSON.parse(saved));
            } catch (e) {}
        }
    }, []);

    const switchUser = (newUser: User) => {
        localStorage.setItem('citylive_current_user', JSON.stringify(newUser));
        setUser(newUser);
        window.dispatchEvent(new Event('user_changed')); // Sync across components
    };

    // Listen for cross-component changes
    useEffect(() => {
        const handleUserChange = () => {
            const saved = localStorage.getItem('citylive_current_user');
            if (saved) {
                try {
                    setUser(JSON.parse(saved));
                } catch (e) {}
            }
        };
        window.addEventListener('user_changed', handleUserChange);
        return () => window.removeEventListener('user_changed', handleUserChange);
    }, []);

    return { user, switchUser };
}
