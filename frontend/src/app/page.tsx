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
        <main className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden p-4 relative">
            <aside className="w-1/3 max-w-md h-full flex flex-col gap-6 pr-4 relative">
                <header className="flex items-center gap-3">
                    <Activity className="text-blue-500 w-8 h-8 animate-pulse" />
                    <h1 className="text-3xl font-bold tracking-tight">City<span className="text-blue-500">Pulse</span></h1>
                </header>

                <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md overflow-hidden flex flex-col">
                    <h2 className="text-xl font-semibold mb-1">Live Updates</h2>
                    <p className="text-gray-400 text-sm mb-2">
                        Verified node logs via Go Gateway
                    </p>

                    {loading ? (
                        <p className="text-gray-500 text-sm mt-4 animate-pulse">Establishing secure link...</p>
                    ) : (
                        <PulseFeed nodes={nodes} />
                    )}
                </div>
            </aside>

            <section className="flex-1 h-full relative">
                <CityMap nodes={nodes} />
            </section>

            <SubmitReportButton onClick={() => setIsModalOpen(true)} />

            {isModalOpen && <ReportModal onClose={() => setIsModalOpen(false)} />}
        </main>
    );
}
