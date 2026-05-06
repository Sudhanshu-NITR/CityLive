"use client";

import { AlertTriangle, Car, MapPin, Clock } from "lucide-react";
import { PulseNode } from "@/types";

export default function PulseFeed({ nodes }: { nodes: PulseNode[] }) {
    if (nodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                    <MapPin size={24} className="text-gray-500" />
                </div>
                <p className="text-gray-400 font-medium">No active pulses</p>
                <p className="text-gray-500 text-sm mt-1">The city is currently operating optimally.</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 space-y-4">
            {nodes.map((node) => {
                const isHazard = node.type === "hazard";

                return (
                    <div
                        key={node.id}
                        className="group relative overflow-hidden rounded-xl bg-black/40 border border-white/10 backdrop-blur-md hover:bg-white/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 shadow-lg hover:shadow-2xl"
                    >
                        {/* Glowing Edge Indicator */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isHazard ? 'bg-gradient-to-b from-red-500 to-orange-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-gradient-to-b from-amber-400 to-yellow-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]'}`} />

                        <div className="p-4 pl-5">
                            <div className="flex items-center justify-between mb-3">
                                {/* Type Badge */}
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${isHazard ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                    {isHazard ? <AlertTriangle size={14} /> : <Car size={14} />}
                                    {node.type}
                                </div>
                                {/* Time Badge */}
                                <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                                    <Clock size={10} className="text-gray-500" />
                                    {node.time}
                                </span>
                            </div>

                            <h3 className="text-white font-semibold mb-1.5 flex items-start gap-2 text-sm leading-tight group-hover:text-blue-300 transition-colors">
                                <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0 group-hover:text-blue-400 transition-colors" />
                                {node.title}
                            </h3>

                            <p className="text-gray-400 text-xs pl-6 line-clamp-2 leading-relaxed">
                                {node.description}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
