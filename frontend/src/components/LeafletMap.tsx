"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { PulseNode } from "@/types";

// Fix for default marker icons in Leaflet + Next.js
const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Marker Creators to match the "Pin" look
const createCustomIcon = (color: string, isVerified: boolean) => {
    const size = isVerified ? 32 : 20;
    const innerSize = isVerified ? 12 : 6;
    
    return L.divIcon({
        className: "custom-div-icon",
        html: `
            <div style="
                background-color: ${color};
                width: ${size}px;
                height: ${size}px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 2px solid white;
                box-shadow: 0 0 ${isVerified ? '20px' : '10px'} ${color};
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    width: ${innerSize}px;
                    height: ${innerSize}px;
                    background: white;
                    border-radius: 50%;
                    transform: rotate(45deg);
                "></div>
            </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
    });
};

export default function LeafletMap({ nodes, center }: { nodes: PulseNode[], center: { lat: number, lng: number } }) {
    return (
        <div className="relative w-full h-full overflow-hidden rounded-xl">
            {/* Map Overlay Layer for extra dimming if needed */}
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
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    className="map-tiles"
                />
                {nodes.map((node) => {
                    const markerColor = node.is_verified ? "#EF4444" : "#F59E0B"; // Red for verified, Yellow for pending
                    const icon = createCustomIcon(markerColor, node.is_verified);
                    
                    return (
                        <Marker
                            key={node.id}
                            position={[node.lat, node.lng]}
                            icon={icon}
                        >
                            <Popup>
                                <div className="text-gray-900 font-medium">
                                    <div className="text-sm font-bold border-b border-gray-100 pb-1 mb-1">
                                        {node.is_verified ? "🛡️ Verified Incident" : "🔍 AI Analysing..."}
                                    </div>
                                    <div className="text-base">{node.title}</div>
                                    <div className="text-xs text-gray-500 mt-1">{node.description}</div>
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">SEV: {node.severity || 0}</span>
                                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">PRI: {node.priority || 0}</span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
