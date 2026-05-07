"use client";

import dynamic from "next/dynamic";
import { ApprovedNode, ValidationNode, ReportNode } from "@/types";

interface CityMapProps {
    approvedNodes: ApprovedNode[];
    validationNodes?: ValidationNode[];
    hoveredReport?: ReportNode | null;
    center?: { lat: number; lng: number };
}

interface LeafletMapProps extends CityMapProps {
    center: { lat: number; lng: number };
}

// Dynamic import avoids SSR issues with Leaflet
const LeafletMap = dynamic<LeafletMapProps>(
    () => import("./LeafletMap"),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full bg-[#0b0e14] animate-pulse flex items-center justify-center text-gray-500 text-sm">
                Loading Map...
            </div>
        ),
    }
);

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

export default function CityMap({
    approvedNodes,
    validationNodes = [],
    hoveredReport = null,
    center = DEFAULT_CENTER,
}: CityMapProps) {
    return (
        <div className="w-full h-full rounded-xl overflow-hidden">
            <LeafletMap
                approvedNodes={approvedNodes}
                validationNodes={validationNodes}
                hoveredReport={hoveredReport}
                center={center}
            />
        </div>
    );
}
