"use client";

import { useState } from "react";
import { X, MapPin, AlertTriangle, Loader2 } from "lucide-react";
import { apiClient } from "@/services/api";
import { useUser } from "@/hooks/useUser";

interface ReportModalProps {
    onClose: () => void;
}

export default function ReportModal({ onClose }: ReportModalProps) {
    const { user } = useUser();
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [locationLabel, setLocationLabel] = useState<string>("");
    const [result, setResult] = useState<{ status: string; message: string } | null>(null);

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setLocationLabel("Geolocation not supported — using default");
            setCoords({ lat: 12.9716, lng: 77.5946 });
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocationLabel(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
                setLocating(false);
            },
            () => {
                setCoords({ lat: 12.9716, lng: 77.5946 });
                setLocationLabel("Using default (Bangalore)");
                setLocating(false);
            },
            { timeout: 8000, maximumAge: 30000 }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!coords) {
            alert("Please detect your location first.");
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const response = await apiClient.submitReport({
                user_id: user?.id || "anonymous",
                description,
                lat: coords.lat,
                lng: coords.lng,
            });
            setResult({ status: response.status, message: response.message });
        } catch (err: any) {
            setResult({ status: "error", message: err.message || "Submission failed." });
        } finally {
            setLoading(false);
        }
    };

    const isSuccess = result?.status === "success";
    const isDiscarded = result?.status === "discarded";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" size={20} />
                        Report a Hazard
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition rounded-lg p-1 hover:bg-white/5">
                        <X size={18} />
                    </button>
                </div>

                {result ? (
                    /* Result State */
                    <div className="p-8 flex flex-col items-center text-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${isSuccess ? "bg-green-500/10 border border-green-500/30" : isDiscarded ? "bg-amber-500/10 border border-amber-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                            {isSuccess ? "✅" : isDiscarded ? "ℹ️" : "❌"}
                        </div>
                        <div>
                            <p className={`font-bold text-base ${isSuccess ? "text-green-400" : isDiscarded ? "text-amber-400" : "text-red-400"}`}>
                                {isSuccess ? "Report Submitted!" : isDiscarded ? "Report Noted" : "Submission Error"}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">{result.message}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold text-white transition mt-2"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

                        {/* Location */}
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                                Your Location
                            </label>
                            <button
                                type="button"
                                onClick={detectLocation}
                                disabled={locating}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition text-sm font-medium text-gray-300 disabled:opacity-60"
                            >
                                {locating ? (
                                    <Loader2 size={16} className="animate-spin text-blue-400" />
                                ) : (
                                    <MapPin size={16} className={coords ? "text-green-400" : "text-gray-500"} />
                                )}
                                {locating
                                    ? "Detecting location..."
                                    : coords
                                    ? locationLabel
                                    : "Tap to detect my location"}
                            </button>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                                What&apos;s happening?
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-colors min-h-[110px] resize-none text-sm text-white placeholder:text-gray-600"
                                placeholder="Describe the hazard (e.g., Major flooding near underpass, road blocked by fallen tree...)"
                                required
                                minLength={10}
                            />
                        </div>

                        {/* AI note */}
                        <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                            <span className="text-blue-400 text-sm mt-0.5">🤖</span>
                            <p className="text-xs text-blue-300/70 leading-relaxed">
                                The Sentinel AI will verify this report and cluster it with nearby hazards. Verified clusters appear as red markers for all users.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !coords}
                            className="w-full py-4 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Sending to Sentinel Agent...
                                </>
                            ) : (
                                "Submit Report"
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
