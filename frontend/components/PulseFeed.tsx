"use client";

import { AlertTriangle, Car, MapPin } from "lucide-react";
import { PulseNode } from "@/types";

export default function PulseFeed({ nodes }: { nodes: PulseNode[] }) {
    if (nodes.length === 0) {
        return <p className="text-gray-500 text-sm mt-4 italic">No active pulses in your area.</p>;
    }

    return (
        <div className="mt-4 flex flex-col gap-3 overflow-y-auto pr-2 pb-20">
            {nodes.map((node) => (
                <div key={node.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                        <div className={`flex items-center gap-2 ${node.color}`}>
                            {node.type === "hazard" ? <AlertTriangle size={18} /> : <Car size={18} />}
                            <span className="font-semibold text-sm uppercase tracking-wider">{node.type}</span>
                        </div>
                        <span className="text-xs text-gray-500">{node.time}</span>
                    </div>

                    <h3 className="text-white font-medium mb-1 flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        {node.title}
                    </h3>
                    <p className="text-gray-400 text-sm pl-6">{node.description}</p>
                </div>
            ))}
        </div>
    );
}
