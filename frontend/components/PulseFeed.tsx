"use client";

import { AlertTriangle, Car, MapPin } from "lucide-react";

// In the future, this will be passed down as props from a live Go SSE connection
const MOCK_NODES = [
    { id: "1", type: "congestion", title: "Majestic Junction", time: "2 mins ago", description: "Heavy traffic buildup due to logging.", color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: "2", type: "hazard", title: "Koramangala Block 5", time: "10 mins ago", description: "Waterlogging reported on main street.", color: "text-red-500", bg: "bg-red-500/10" },
];

export default function PulseFeed() {
    return (
        <div className="mt-4 flex flex-col gap-3 overflow-y-auto pr-2 pb-20">
            {MOCK_NODES.map((node) => (
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
