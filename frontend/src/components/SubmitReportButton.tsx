"use client";

import { PlusCircle } from "lucide-react";

export default function SubmitReportButton({ onClick }: { onClick: () => void }) {
    return (
        <div className="absolute bottom-6 left-4 w-[calc(33.333333%-2rem)] max-w-104">
            <button
                onClick={onClick}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 border border-blue-400/50"
            >
                <PlusCircle size={20} />
                Submit Pulse Report
            </button>
        </div>
    );
}
