"use client";

import { PlusCircle } from "lucide-react";

export default function SubmitReportButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="group relative w-full overflow-hidden rounded-2xl p-[1px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.6)]"
        >
            {/* Animated Gradient Border */}
            <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Inner Glass Button */}
            <div className="relative flex items-center justify-center gap-3 bg-black/80 backdrop-blur-md w-full py-4 rounded-2xl text-white font-semibold transition-all group-hover:bg-black/60">
                <PlusCircle size={22} className="text-cyan-400 group-hover:rotate-90 transition-transform duration-300" />
                <span className="tracking-wide">Submit Report</span>
            </div>
        </button>
    );
}
