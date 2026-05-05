"use client";

import { useState, useEffect } from "react";
import CityMap from "@/components/CityMap";
import PulseFeed from "@/components/PulseFeed";
import SubmitReportButton from "@/components/SubmitReportButton";
import ReportModal from "@/components/ReportModal";
import { Activity } from "lucide-react";
import { PulseNode } from "@/types";

export default function Home() {
  const [nodes, setNodes] = useState<PulseNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // 1. Initial Load: Fetch existing nodes from Go API Gateway
    const fetchNodes = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/v1/nodes");
        const data = await res.json();
        setNodes(data || []);
      } catch (err) {
        console.error("Failed to fetch node data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNodes();

    // 2. Real-Time Link: Connect to the Go Event Service Stream
    const eventSource = new EventSource("http://localhost:8081/stream");

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "NEW_PULSE_NODE") {
          // Instantly append the new verified node to our state!
          setNodes((prevNodes) => [...prevNodes, message.payload]);

          // Optional: You can play a sound or trigger a toast notification here
          console.log("Live update received from Flash Intelligence Layer!");
        }
      } catch (err) {
        console.error("Error parsing event stream data:", err);
      }
    };

    // Cleanup connection when user leaves the page
    return () => {
      eventSource.close();
    };
  }, []);


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
