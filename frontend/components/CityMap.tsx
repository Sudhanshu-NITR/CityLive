"use client";

import { useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

// Mock data representing what the Go API Gateway will eventually return
const MOCK_NODES = [
    { id: "1", lat: 12.9716, lng: 77.5946, status: "congestion", title: "Majestic Junction" },
    { id: "2", lat: 12.9352, lng: 77.6245, status: "hazard", title: "Koramangala Block 5" },
];

export default function CityMap() {
    // Center roughly on Bangalore (assuming from your earlier Majestic/CV Raman Rd references)
    const defaultCenter = { lat: 12.9716, lng: 77.5946 };

    return (
        <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-gray-800 shadow-xl">
            {/* APIProvider loads the Google Maps Script. It automatically picks up NEXT_PUBLIC_GOOGLE_MAPS_API_KEY if passed, but we'll feed it explicitly here */}
            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
                <Map
                    defaultZoom={13}
                    defaultCenter={defaultCenter}
                    mapId="CITYPULSE_MAP_ID" // Requires a Map ID tied to your API key for AdvancedMarkers (or just visually modern maps)
                    disableDefaultUI={true}
                >
                    {MOCK_NODES.map((node) => (
                        <AdvancedMarker key={node.id} position={{ lat: node.lat, lng: node.lng }}>
                            <Pin
                                background={node.status === "hazard" ? "#EF4444" : "#F59E0B"}
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
