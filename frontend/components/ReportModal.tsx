"use client";

import { useState } from "react";
import { X, UploadCloud, MapPin, AlertTriangle } from "lucide-react";

interface ReportModalProps {
    onClose: () => void;
}

export default function ReportModal({ onClose }: ReportModalProps) {
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("Majestic Junction"); // Default for now
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Sending data to Next.js -> Go API Gateway -> Python Service
            const res = await fetch("http://localhost:8080/api/v1/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "hazard",
                    title: location,
                    description: description,
                    lat: 12.9716, // In a real app, grab from navigator.geolocation
                    lng: 77.5946,
                }),
            });

            if (res.ok) {
                alert("Pulse Report submitted successfully for AI validation!");
                onClose();
            } else {
                alert("Failed to submit report.");
            }
        } catch (err) {
            console.error(err);
            alert("Error connecting to API Gateway.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <AlertTriangle className="text-red-500" />
                        Report Hazard
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Location</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-9 pr-3 focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Where is this happening?"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 focus:outline-none focus:border-blue-500 transition-colors min-h-[100px] resize-none"
                            placeholder="Describe the situation (e.g., Flood, Accident, Traffic)"
                            required
                        />
                    </div>

                    <div className="border-2 border-dashed border-white/20 rounded-lg p-6 flex flex-col items-center justify-center text-gray-400 hover:bg-white/5 hover:border-white/30 transition cursor-pointer">
                        <UploadCloud size={28} className="mb-2 text-blue-500" />
                        <span className="text-sm font-medium text-white">Upload Image or Video</span>
                        <span className="text-xs mt-1">Multi-modal AI analysis will process this</span>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"
                    >
                        {loading ? "Submitting securely..." : "Submit Pulse Report"}
                    </button>
                </form>
            </div>
        </div>
    );
}
