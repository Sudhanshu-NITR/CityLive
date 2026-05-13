"use client";

import { useState, useEffect, useRef } from "react";
import { User } from "@/types";
import { apiClient } from "@/services/api";
import { useUser } from "@/hooks/useUser";
import { ChevronDown, User as UserIcon, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UserSwitcher() {
    const router = useRouter();
    const { user, switchUser } = useUser();
    const [users, setUsers] = useState<User[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const data = await apiClient.getUsers();
                console.log("data-> ", data);
                setUsers(data || []);
                // If no user is logged in, default to the first citizen
                if (!localStorage.getItem('citylive_current_user') && data.length > 0) {
                    switchUser(data.find((u: User) => u.role === "citizen") || data[0]);
                }
            } catch (err) {
                console.error("Failed to load users for switcher:", err);
            }
        };
        loadUsers();
    }, [switchUser]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // if (!user) return null;

    return (
        <div className="relative z-100" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1.5 pr-3 bg-black/40 hover:bg-black/30 border border-white/10 rounded-full transition-all cursor-pointer"
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-inner ${user?.role === 'admin' ? 'bg-linear-to-br from-red-600 to-purple-600' : 'bg-linear-to-br from-blue-500 to-cyan-500'}`}>
                    {user?.name?.charAt(0) || <UserIcon size={14} />}
                </div>
                <div className="flex flex-col items-start text-left">
                    <span className="text-xs font-bold text-gray-200 leading-tight">{user?.name || "Select Persona"}</span>
                    <span className="text-[9px] font-semibold tracking-widest uppercase text-gray-400 leading-tight">{user?.role || "Citizen / Admin"}</span>
                </div>
                <ChevronDown size={14} className={`text-gray-400 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 border-b border-white/5 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Switch Profile</span>
                    </div>
                    {users.map(u => (
                        <button
                            key={u.id}
                            onClick={() => {
                                switchUser(u);
                                setIsOpen(false);
                                if (u.role === 'admin') {
                                    router.push('/admin');
                                } else {
                                    router.push('/');
                                }
                            }}
                            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors ${u.id === user?.id ? 'bg-blue-500/10 text-blue-400 font-semibold' : 'text-gray-300 hover:bg-white/5'}`}
                        >
                            {u.role === "admin" ? <ShieldAlert size={14} className="text-red-400" /> : <UserIcon size={14} className="text-blue-400" />}
                            {u.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
