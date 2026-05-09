// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import CityMap from "@/components/CityMap";
import SubmitReportButton from "@/components/SubmitReportButton";
import ReportModal from "@/components/ReportModal";
import { Activity, ShieldAlert, AlertTriangle, MapPin, Clock } from "lucide-react";
import { ApprovedNode, ValidationNode } from "@/types";
import { apiClient } from "@/services/api";
import { useLiveNodes } from "@/hooks/useLiveNodes";
import UserSwitcher from "@/components/UserSwitcher";

export default function Home() {
    const [initialApproved, setInitialApproved] = useState<ApprovedNode[]>([]);
    const [initialValidation, setInitialValidation] = useState<ValidationNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [approved, validation] = await Promise.all([
                    apiClient.getApprovedNodes(),
                    apiClient.getValidationNodes().catch(() => []), // non-blocking if gateway rejects
                ]);
                setInitialApproved(approved || []);
                setInitialValidation(validation || []);
            } catch (err) {
                console.error("Failed to fetch map data:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const { approvedNodes, validationNodes } = useLiveNodes(initialApproved, initialValidation);

    return (
        <main className="relative w-full h-screen overflow-hidden bg-black text-white">
            {/* Background Map */}
            <div className="absolute inset-0 z-0">
                <CityMap
                    approvedNodes={approvedNodes}
                    validationNodes={validationNodes}
                />
                <div className="absolute inset-0 bg-linear-to-r from-[#050505] via-black/40 to-transparent pointer-events-none" />
            </div>

            {/* User Persona Switcher */}
            <div className="absolute top-6 right-6 z-100 pointer-events-auto">
                <UserSwitcher />
            </div>

            {/* Floating UI */}
            <div className="relative z-10 flex h-full p-6 pointer-events-none">
                <aside className="w-[400px] h-full flex flex-col gap-5 pointer-events-auto">

                    {/* Header */}
                    <header className="flex items-center gap-3 p-5 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-blue-900/20">
                        <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                            <Activity className="text-blue-400 w-6 h-6 animate-pulse" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                            City<span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-300">Live</span>
                        </h1>
                        <div className="ml-auto flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative h-2 w-2 rounded-full bg-green-500" />
                            </span>
                            <span className="text-xs text-green-400 font-semibold">LIVE</span>
                        </div>
                    </header>

                    {/* Legend */}
                    <div className="flex gap-3 px-1">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                            <span className="text-[11px] text-gray-400">Admin Verified</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
                            <span className="text-[11px] text-gray-400">AI Detected (Unverified)</span>
                        </div>
                    </div>

                    {/* Active Hazards Feed */}
                    <div className="flex-1 flex flex-col bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-linear-to-b from-white/5 to-transparent">
                            <div>
                                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                    <ShieldAlert size={16} className="text-red-400" />
                                    Active Hazards
                                </h2>
                                <p className="text-gray-400 text-xs mt-0.5">Admin-verified incidents</p>
                            </div>
                            <div className="px-3 py-1 bg-red-500/10 rounded-full text-xs font-bold text-red-400 border border-red-500/20">
                                {approvedNodes.length} Active
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                                    <Activity className="animate-spin text-blue-500" size={22} />
                                    <p className="text-xs tracking-widest uppercase">Syncing...</p>
                                </div>
                            ) : approvedNodes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                                    <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                                        <MapPin size={20} className="text-gray-500" />
                                    </div>
                                    <p className="text-gray-400 font-medium text-sm">City operating normally</p>
                                    <p className="text-gray-500 text-xs">No verified hazards right now.</p>
                                </div>
                            ) : (
                                approvedNodes.map((node) => (
                                    <div
                                        key={node.id}
                                        className="group relative overflow-hidden rounded-xl bg-black/40 border border-red-500/10 hover:border-red-500/30 backdrop-blur-md hover:bg-red-500/5 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 shadow-lg"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-red-500 to-red-700 shadow-[0_0_12px_rgba(239,68,68,0.7)]" />
                                        <div className="p-4 pl-5">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                                                    🛡️ {node.hazard_type}
                                                </span>
                                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                    <Clock size={9} />
                                                    {new Date(node.approved_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                            <h3 className="text-white font-semibold text-sm leading-snug group-hover:text-red-300 transition-colors">
                                                {node.title}
                                            </h3>
                                            {node.ai_post_approval_notes && (
                                                <p className="text-gray-400 text-xs mt-1 line-clamp-2 group-hover:line-clamp-none leading-relaxed transition-all">
                                                    {node.ai_post_approval_notes}
                                                </p>
                                            )}
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded font-bold">SEV {node.severity}/10</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* AI-detected (unverified) count bar */}
                        {validationNodes.length > 0 && (
                            <div className="border-t border-amber-500/10 px-5 py-3 flex items-center gap-2 bg-amber-500/5">
                                <AlertTriangle size={13} className="text-amber-500" />
                                <p className="text-xs text-amber-400/80">
                                    <span className="font-bold">{validationNodes.length}</span> AI-detected cluster{validationNodes.length !== 1 ? "s" : ""} pending admin review
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <SubmitReportButton onClick={() => setIsModalOpen(true)} />
                </aside>
            </div>

            {isModalOpen && <ReportModal onClose={() => setIsModalOpen(false)} />}
        </main>
    );
}
