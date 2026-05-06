// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import CityMap from "@/components/CityMap";
import { PulseNode } from "@/types";
import { ShieldAlert, Train, CheckCircle, BrainCircuit, Activity, ChevronRight, AlertTriangle } from "lucide-react";
import { apiClient } from "@/services/api";
import { useLiveNodes } from "@/hooks/useLiveNodes";

export default function AdminDashboard() {
    const [initialNodes, setInitialNodes] = useState<PulseNode[]>([]);
    const [insights, setInsights] = useState<{ title: string, description: string }[]>([]);

    useEffect(() => {
        const fetchNodes = async () => {
            try {
                const data = await apiClient.getNodes();
                setInitialNodes(data || []);
            } catch (err) {
                console.error("Failed to fetch node data:", err);
            }
        };

        const fetchInsights = async () => {
            try {
                const data = await apiClient.getInsights();
                setInsights(data || []);
            } catch (err) {
                console.error("Failed to fetch insights:", err);
            }
        };

        fetchNodes();
        fetchInsights();

        const intervalId = setInterval(() => {
            fetchInsights();
        }, 10000);

        return () => clearInterval(intervalId);
    }, []);

    const { nodes } = useLiveNodes(initialNodes);

    return (
        <main className="relative w-full h-screen overflow-hidden bg-black text-white">
            {/* Background Map Layer */}
            <div className="absolute inset-0 z-0">
                <CityMap nodes={nodes} />
                {/* Dual-sided gradient to ensure both sidebars are readable */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 pointer-events-none" />
            </div>

            {/* Foreground UI */}
            <div className="relative z-10 flex flex-col h-full p-6 pointer-events-none gap-6">

                {/* Top Navigation Bar */}
                <header className="flex items-center justify-between bg-black/40 border border-white/10 p-5 rounded-2xl backdrop-blur-2xl shadow-2xl pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                            <Activity className="text-blue-400 w-6 h-6 animate-pulse" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            <span>City<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Live</span></span>
                            <span className="font-light text-gray-500 text-lg">|</span>
                            <span className="font-medium text-gray-300 text-lg">Command Center</span>
                        </h1>
                    </div>
                    <nav className="flex gap-8 text-sm font-semibold text-gray-400">
                        <a href="#" className="text-white hover:text-cyan-400 transition-colors">Live Map</a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">Reports</a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">Analytics</a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">AI Insights</a>
                    </nav>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold shadow-lg shadow-blue-500/20 border border-white/10">
                        AD
                    </div>
                </header>

                <div className="flex-1 flex justify-between gap-6 overflow-hidden">

                    {/* Left Column: Stats & Pending */}
                    <div className="w-[420px] flex flex-col gap-6 pointer-events-auto h-full overflow-y-auto pb-4 scrollbar-hide">

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <StatCard icon={<ShieldAlert className="text-red-400" />} count="5" label="Active Alert Zones" />
                            <StatCard icon={<Train className="text-amber-400" />} count="3" label="Metro Disruptions" />
                            <StatCard icon={<CheckCircle className="text-green-400" />} count={nodes.length.toString()} label="Reports Verified" />
                            <StatCard icon={<BrainCircuit className="text-purple-400" />} count="16" label="AI Predictions" />
                        </div>

                        {/* Pending Reports */}
                        <div className="flex-1 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden min-h-[300px]">
                            <div className="p-5 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                                <h2 className="text-sm font-bold text-gray-300 tracking-wider uppercase">Pending Review (21)</h2>
                            </div>
                            <div className="flex flex-col gap-3 overflow-y-auto p-4">
                                <PendingReportCard title="Fire hazard at Brigade Rd" time="2m ago" />
                                <PendingReportCard title="Severe waterlogging" time="12m ago" />
                                <PendingReportCard title="Accident blocking lane" time="15m ago" />
                            </div>
                            <button className="mt-auto w-full py-4 bg-white/5 hover:bg-white/10 text-sm transition font-medium border-t border-white/5 text-gray-300">
                                View All Reports
                            </button>
                        </div>
                    </div>

                    {/* Right Column: AI Insights & Actions */}
                    <div className="w-[420px] flex flex-col gap-6 pointer-events-auto h-full overflow-y-auto pb-4 scrollbar-hide">

                        {/* Sentinel AI Panel */}
                        <div className="bg-black/40 backdrop-blur-2xl border border-purple-500/20 rounded-2xl shadow-2xl shadow-purple-900/20 flex-1 overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-purple-500/10 bg-gradient-to-br from-purple-900/30 to-transparent">
                                <h2 className="text-sm font-bold text-purple-400 tracking-wider uppercase flex items-center gap-2">
                                    <BrainCircuit size={18} />
                                    Sentinel AI Insights
                                </h2>
                            </div>
                            <div className="p-5 space-y-4 overflow-y-auto">
                                {insights.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <BrainCircuit size={32} className="text-purple-500/50 animate-pulse" />
                                        <div className="text-xs text-purple-400 font-medium uppercase tracking-widest">Running Analysis...</div>
                                    </div>
                                ) : (
                                    insights.map((insight, idx) => (
                                        <div key={idx} className="bg-white/5 hover:bg-white/10 transition p-4 rounded-xl border border-white/5 group cursor-pointer">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle size={16} className="text-amber-500" />
                                                <span className="font-semibold text-sm text-gray-200 group-hover:text-white transition">{insight.title}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 leading-relaxed">
                                                {insight.description}
                                            </p>
                                            <div className="text-xs text-purple-400 mt-3 font-semibold flex items-center hover:text-purple-300">
                                                Expand Analysis <ChevronRight size={14} className="ml-1" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Action Center */}
                        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl">
                            <div className="p-5 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                                <h2 className="text-sm font-bold text-gray-300 tracking-wider uppercase">Emergency Actions</h2>
                            </div>
                            <div className="p-5 flex flex-col gap-3">
                                <button className="w-full py-3.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold transition flex justify-center items-center gap-2">
                                    <ShieldAlert size={16} />
                                    Issue City-Wide Alert
                                </button>
                                <button className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-sm font-semibold shadow-[0_0_20px_rgba(37,99,235,0.3)] transition flex justify-center items-center gap-2">
                                    <Activity size={16} />
                                    Notify Response Teams
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </main>
    );
}

// --- Helper Components ---

function StatCard({ icon, count, label }: { icon: React.ReactNode, count: string, label: string }) {
    return (
        <div className="bg-black/40 border border-white/10 rounded-xl p-5 backdrop-blur-md flex flex-col justify-center shadow-lg hover:bg-white/5 transition cursor-pointer">
            <div className="mb-3">{icon}</div>
            <div className="text-2xl font-bold text-white">{count}</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{label}</div>
        </div>
    );
}

function PendingReportCard({ title, time }: { title: string, time: string }) {
    return (
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer flex justify-between items-center group">
            <div>
                <h4 className="text-sm font-medium text-gray-200 group-hover:text-white transition">{title}</h4>
                <span className="text-xs text-gray-500 mt-0.5 block">{time}</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <ChevronRight size={14} className="text-gray-400 group-hover:text-white transition" />
            </div>
        </div>
    );
}
