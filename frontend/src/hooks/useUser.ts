import { useState, useEffect } from 'react';
import { User } from '../types';

export function useUser() {
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window === 'undefined') return null;
        const saved = localStorage.getItem('citylive_current_user');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.log(`Could not set user, Error: ${e}`)
                return null;
            }
        }
        return null;
    });

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
                } catch { }
            }
        };
        window.addEventListener('user_changed', handleUserChange);
        return () => window.removeEventListener('user_changed', handleUserChange);
    }, []);

    return { user, switchUser };
}
