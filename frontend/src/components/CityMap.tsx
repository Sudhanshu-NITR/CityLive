"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { PulseNode } from "@/types";

// Dynamic import for Leaflet to avoid SSR issues
import dynamic from "next/dynamic";

const LeafletMap = dynamic<{ nodes: PulseNode[]; center: { lat: number; lng: number } }>(
    () => import("./LeafletMap"),
    {
        ssr: false,
        loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-500">Loading Map...</div>
    }
);

export default function CityMap({ nodes }: { nodes: PulseNode[] }) {
    const [provider, setProvider] = useState<string>("leaflet");

    useEffect(() => {
        // Default to leaflet if no key is present or if explicitly set
        const envProvider = process.env.NEXT_PUBLIC_MAP_PROVIDER;
        const hasGoogleKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (envProvider === "google" && hasGoogleKey) {
            setProvider("google");
        } else {
            setProvider("leaflet");
        }
    }, []);

    const defaultCenter = { lat: 12.9716, lng: 77.5946 };

    if (provider === "google") {
        return (
            <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-gray-800 shadow-xl">
                <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
                    <Map
                        defaultZoom={13}
                        defaultCenter={defaultCenter}
                        mapId="CITYLIVE_MAP_ID"
                        disableDefaultUI={true}
                    >
                        {nodes.map((node) => (
                            <AdvancedMarker key={node.id} position={{ lat: node.lat, lng: node.lng }}>
                                <Pin
                                    background={node.type === "hazard" ? "#EF4444" : "#F59E0B"}
                                    borderColor="#b91c1c"
                                    glyphColor="#ffffff"
                                />
                            </AdvancedMarker>
                        ))}
                    </Map>
                </APIProvider>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-gray-800 shadow-xl">
            <LeafletMap nodes={nodes} center={defaultCenter} />
        </div>
    );
}
