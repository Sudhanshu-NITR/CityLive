// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import CityMap from "@/components/CityMap";
import PulseFeed from "@/components/PulseFeed";
import SubmitReportButton from "@/components/SubmitReportButton";
import ReportModal from "@/components/ReportModal";
import { Activity } from "lucide-react";
import { PulseNode } from "@/types";
import { apiClient } from "@/services/api";
import { useLiveNodes } from "@/hooks/useLiveNodes";

export default function Home() {
    const [initialNodes, setInitialNodes] = useState<PulseNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 1. Initial Load via API Service
    useEffect(() => {
        const fetchNodes = async () => {
            try {
                const data = await apiClient.getNodes();
                setInitialNodes(data || []);
            } catch (err) {
                console.error("Failed to fetch node data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNodes();
    }, []);

    // 2. Pass to Custom Hook for Live SSE Connection
    const { nodes } = useLiveNodes(initialNodes);

    return (
        <main className="relative w-full h-screen overflow-hidden bg-black text-white">
            {/* Background Map Layer */}
            <div className="absolute inset-0 z-0">
                <CityMap nodes={nodes} />
                {/* Subtle gradient overlay so the UI pops against the map */}
                <div className="absolute inset-0 bg-linear-to-r from-[#050505] via-black/40 to-transparent pointer-events-none" />
            </div>

            {/* Floating UI Container */}
            <div className="relative z-10 flex h-full p-6 pointer-events-none">

                {/* Left Glass Panel */}
                <aside className="w-[420px] h-full flex flex-col gap-6 pointer-events-auto">

                    {/* Header */}
                    <header className="flex items-center justify-between p-5 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-blue-900/20">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                                <Activity className="text-blue-400 w-6 h-6 animate-pulse" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                City<span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-300">Live</span>
                            </h1>
                        </div>
                    </header>

                    {/* Live Feed Container */}
                    <div className="flex-1 flex flex-col bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-linear-to-b from-white/5 to-transparent">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                    </span>
                                    Live Updates
                                </h2>
                                <p className="text-gray-400 text-xs mt-1">Verified node logs via Go Gateway</p>
                            </div>
                            <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-gray-200 border border-white/5 shadow-inner">
                                {nodes.length} Active
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {loading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                                    <Activity className="animate-spin text-blue-500" size={24} />
                                    <p className="text-xs font-medium tracking-widest uppercase">Syncing Uplink...</p>
                                </div>
                            ) : (
                                <PulseFeed nodes={nodes} />
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <SubmitReportButton onClick={() => setIsModalOpen(true)} />
                </aside>
            </div>

            {isModalOpen && <ReportModal onClose={() => setIsModalOpen(false)} />}
        </main>
    );
}
