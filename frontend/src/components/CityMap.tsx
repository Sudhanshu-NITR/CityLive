"use client";

import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { PulseNode } from "@/types";

export default function CityMap({ nodes }: { nodes: PulseNode[] }) {
    const defaultCenter = { lat: 12.9716, lng: 77.5946 };

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
