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
const createCustomIcon = (color: string) => {
    return L.divIcon({
        className: "custom-div-icon",
        html: `
            <div style="
                background-color: ${color};
                width: 24px;
                height: 24px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 2px solid white;
                box-shadow: 0 0 15px ${color};
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    width: 8px;
                    height: 8px;
                    background: white;
                    border-radius: 50%;
                    transform: rotate(45deg);
                "></div>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
    });
};

const hazardIcon = createCustomIcon("#EF4444");
const eventIcon = createCustomIcon("#F59E0B");

export default function LeafletMap({ nodes, center }: { nodes: PulseNode[], center: { lat: number, lng: number } }) {
    return (
        <div className="relative w-full h-full overflow-hidden rounded-xl">
            {/* Map Overlay Layer for extra dimming if needed */}
            <div className="absolute inset-0 z-[10] pointer-events-none bg-black/10 shadow-[inset_0_0_100px_rgba(0,0,0,0.3)]" />

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
                {nodes.map((node) => (
                    <Marker
                        key={node.id}
                        position={[node.lat, node.lng]}
                        icon={node.type === "hazard" ? hazardIcon : eventIcon}
                    >
                        <Popup>
                            <div className="text-gray-900 font-medium">
                                {node.title || (node.type === "hazard" ? "Hazard Reported" : "Event Reported")}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
