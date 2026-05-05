"use client";

import { useState, useEffect } from "react";
import CityMap from "@/components/CityMap";
import { PulseNode } from "@/types";
import { ShieldAlert, Train, CheckCircle, BrainCircuit, Activity, ChevronRight, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
    const [nodes, setNodes] = useState<PulseNode[]>([]);
    const [insights, setInsights] = useState<{ title: string, description: string }[]>([]);

    useEffect(() => {
        // Fetch live verified data from our Go API Gateway
        const fetchNodes = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/nodes`);
                const data = await res.json();
                setNodes(data || []);
            } catch (err) {
                console.error("Failed to fetch node data:", err);
            }
        };

        const fetchInsights = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/ai-insights`);
                const data = await res.json();
                setInsights(data || []);
            } catch (err) {
                console.error("Failed to fetch insights:", err);
            }
        };

        // Call them both immediately on page load
        fetchNodes();
        fetchInsights();

        // Call them both every 10 seconds
        const intervalId = setInterval(() => {
            fetchNodes();
            fetchInsights();
        }, 10000);

        return () => clearInterval(intervalId);
    }, []);


    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col gap-6">

            {/* Top Navigation Bar */}
            <header className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <Activity className="text-blue-500 w-8 h-8" />
                    <h1 className="text-2xl font-bold tracking-tight">CityLive <span className="font-light text-gray-400">| Command Center</span></h1>
                </div>
                <nav className="flex gap-6 text-sm font-medium text-gray-400">
                    <a href="#" className="text-white hover:text-blue-400 transition">Live Map</a>
                    <a href="#" className="hover:text-blue-400 transition">Reports</a>
                    <a href="#" className="hover:text-blue-400 transition">Analytics</a>
                    <a href="#" className="hover:text-blue-400 transition">AI Insights</a>
                </nav>
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                    AD
                </div>
            </header>

            {/* Main Dashboard Grid */}
            <main className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">

                {/* Left Column: Stats & Analytics */}
                <div className="col-span-3 flex flex-col gap-6">

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard icon={<ShieldAlert className="text-red-500" />} count="5" label="Active Alert Zones" />
                        <StatCard icon={<Train className="text-amber-500" />} count="3" label="Metro Disruptions" />
                        <StatCard icon={<CheckCircle className="text-green-500" />} count={nodes.length.toString()} label="Reports Verified" />
                        <StatCard icon={<BrainCircuit className="text-purple-500" />} count="16" label="AI Predictions" />
                    </div>

                    {/* Pending Reports (Mocked for now) */}
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md flex flex-col overflow-hidden">
                        <h2 className="text-sm font-bold text-gray-400 tracking-wider uppercase mb-4">Pending Review (21)</h2>
                        <div className="flex flex-col gap-3 overflow-y-auto pr-2">
                            <PendingReportCard title="Fire hazard at Brigade Rd" time="2m ago" />
                            <PendingReportCard title="Severe waterlogging" time="12m ago" />
                            <PendingReportCard title="Accident blocking lane" time="15m ago" />
                        </div>
                        <button className="mt-auto w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition font-medium">
                            View All Reports
                        </button>
                    </div>
                </div>

                {/* Center Column: Live Map */}
                <div className="col-span-6 bg-white/5 border border-white/10 rounded-2xl p-2 backdrop-blur-md overflow-hidden relative">
                    <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs font-semibold tracking-wider">LIVE SYSTEM FEED</span>
                    </div>
                    <CityMap nodes={nodes} />
                </div>

                {/* Right Column: AI Insights & Actions */}
                <div className="col-span-3 flex flex-col gap-6">

                    {/* AI Insights Panel */}
                    <div className="bg-linear-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-2xl p-5 backdrop-blur-md flex-1">
                        <h2 className="text-sm font-bold text-purple-400 tracking-wider uppercase flex items-center gap-2 mb-4">
                            <BrainCircuit size={16} />
                            Sentinel AI Insights
                        </h2>
                        <div className="space-y-4">
                            {insights.length === 0 ? (
                                <div className="text-xs text-purple-400 animate-pulse">Running Graph Analysis...</div>
                            ) : (
                                insights.map((insight, idx) => (
                                    <div key={idx} className="bg-black/40 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle size={16} className="text-amber-500" />
                                            <span className="font-semibold text-sm">{insight.title}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            {insight.description}
                                        </p>
                                        <button className="text-xs text-purple-400 mt-3 font-semibold flex items-center hover:text-purple-300">
                                            Expand Analysis <ChevronRight size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Action Center */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
                        <h2 className="text-sm font-bold text-gray-400 tracking-wider uppercase mb-4">Quick Actions</h2>
                        <div className="flex flex-col gap-3">
                            <button className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold transition">
                                Issue City-Wide Alert
                            </button>
                            <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition">
                                Notify Response Teams
                            </button>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

// --- Helper Components for the Dashboard UI ---

function StatCard({ icon, count, label }: { icon: React.ReactNode, count: string, label: string }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col justify-center">
            <div className="mb-2">{icon}</div>
            <div className="text-2xl font-bold">{count}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">{label}</div>
        </div>
    );
}

function PendingReportCard({ title, time }: { title: string, time: string }) {
    return (
        <div className="p-3 rounded-xl bg-black/40 border border-white/5 hover:bg-white/10 transition cursor-pointer flex justify-between items-center group">
            <div>
                <h4 className="text-sm font-medium text-gray-200 group-hover:text-white transition">{title}</h4>
                <span className="text-xs text-gray-500">{time}</span>
            </div>
            <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition" />
        </div>
    );
}
