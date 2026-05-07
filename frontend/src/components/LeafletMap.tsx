"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ApprovedNode, ValidationNode, ReportNode } from "@/types";

// ── Marker Icon Factories ────────────────────────────────────────────────────

/** Large red pin — Admin-verified ApprovedNode */
const approvedIcon = (severity: number) => {
    const size = 36 + Math.floor((severity / 10) * 10); // 36–46px based on severity
    return L.divIcon({
        className: "",
        html: `
            <div style="
                background: radial-gradient(circle at 35% 35%, #ff6b6b, #dc2626);
                width: ${size}px; height: ${size}px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 2.5px solid #fff;
                box-shadow: 0 0 24px rgba(220,38,38,0.85), 0 4px 12px rgba(0,0,0,0.4);
                display:flex; align-items:center; justify-content:center;
            ">
                <div style="width:${size * 0.3}px; height:${size * 0.3}px; background:#fff; border-radius:50%; transform:rotate(45deg);"></div>
            </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -(size + 4)],
    });
};

/** Medium amber pin — AI-detected ValidationNode (pending admin review) */
const validationIcon = (severity: number) => {
    const size = 22 + Math.floor((severity / 10) * 8); // 22–30px
    return L.divIcon({
        className: "",
        html: `
            <div style="
                background: radial-gradient(circle at 35% 35%, #fcd34d, #d97706);
                width: ${size}px; height: ${size}px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 2px solid #fff;
                box-shadow: 0 0 14px rgba(217,119,6,0.75), 0 2px 6px rgba(0,0,0,0.3);
                display:flex; align-items:center; justify-content:center;
            ">
                <div style="width:${size * 0.28}px; height:${size * 0.28}px; background:#fff; border-radius:50%; transform:rotate(45deg);"></div>
            </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -(size + 4)],
    });
};

/** Small green dot — individual ReportNode (shown on admin hover) */
const reportIcon = () =>
    L.divIcon({
        className: "",
        html: `
            <div style="
                background: #22c55e;
                width: 12px; height: 12px;
                border-radius: 50%;
                border: 2px solid #fff;
                box-shadow: 0 0 8px rgba(34,197,94,0.9);
            "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        popupAnchor: [0, -10],
    });

// ── Auto-pan to hovered report ───────────────────────────────────────────────
function PanTo({ target }: { target: { lat: number; lng: number } | null }) {
    const map = useMap();
    useEffect(() => {
        if (target) map.panTo([target.lat, target.lng], { animate: true, duration: 0.5 });
    }, [target, map]);
    return null;
}

// ── Component Props ──────────────────────────────────────────────────────────
interface LeafletMapProps {
    approvedNodes: ApprovedNode[];
    validationNodes?: ValidationNode[];  // Admin only
    hoveredReport?: ReportNode | null;   // Admin only — shows small green pin
    center?: { lat: number; lng: number };
}

export default function LeafletMap({
    approvedNodes,
    validationNodes = [],
    hoveredReport = null,
    center = { lat: 12.9716, lng: 77.5946 },
}: LeafletMapProps) {
    return (
        <div className="relative w-full h-full overflow-hidden rounded-xl">
            {/* Dimming overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none bg-black/10 shadow-[inset_0_0_100px_rgba(0,0,0,0.3)]" />

            <MapContainer
                center={[center.lat, center.lng]}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%", background: "#0b0e14" }}
                zoomControl={false}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {/* Auto-pan when admin hovers a report */}
                <PanTo target={hoveredReport} />

                {/* ── ApprovedNodes — large red markers ── */}
                {approvedNodes.map((node) => (
                    <Marker
                        key={node.id}
                        position={[node.lat, node.lng]}
                        icon={approvedIcon(node.severity)}
                    >
                        <Popup>
                            <div className="text-gray-900 min-w-[180px]">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                                        🛡️ VERIFIED
                                    </span>
                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">
                                        {node.hazard_type}
                                    </span>
                                </div>
                                <p className="font-bold text-sm">{node.title}</p>
                                {node.ai_post_approval_notes && (
                                    <p className="text-xs text-gray-500 mt-1">{node.ai_post_approval_notes}</p>
                                )}
                                <div className="flex gap-2 mt-2">
                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">
                                        SEV {node.severity}/10
                                    </span>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* ── ValidationNodes — medium amber markers ── */}
                {validationNodes.map((node) => (
                    <Marker
                        key={node.id}
                        position={[node.lat, node.lng]}
                        icon={validationIcon(node.severity)}
                    >
                        <Popup>
                            <div className="text-gray-900 min-w-[200px]">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                                        🔍 AI DETECTED
                                    </span>
                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">
                                        {node.hazard_type}
                                    </span>
                                </div>
                                <p className="font-bold text-sm">{node.title}</p>
                                <p className="text-xs text-gray-500 mt-1 italic">
                                    ⚠️ Not yet verified by admin
                                </p>
                                <p className="text-xs text-gray-600 mt-1 leading-snug">{node.ai_explanation}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">
                                        SEV {node.severity}/10
                                    </span>
                                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">
                                        PRI {node.priority}/10
                                    </span>
                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                                        {node.report_count} reports
                                    </span>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* ── Hovered ReportNode — small green dot (admin only) ── */}
                {hoveredReport && (
                    <Marker
                        key={`hovered-${hoveredReport.id}`}
                        position={[hoveredReport.lat, hoveredReport.lng]}
                        icon={reportIcon()}
                    >
                        <Popup>
                            <div className="text-gray-900 min-w-[160px]">
                                <p className="font-bold text-xs text-green-700 mb-1">📍 Report</p>
                                <p className="text-xs">{hoveredReport.description}</p>
                                <p className="text-[10px] text-gray-400 mt-1">by {hoveredReport.user_id}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
