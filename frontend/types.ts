export interface PulseNode {
    id: string;
    type: "hazard" | "congestion";
    title: string;
    time: string;
    description: string;
    lat: number;
    lng: number;
    color: string;
    bg: string;
}
