// src/types/index.ts

export interface PulseNode {
    id: string;
    type: string;
    title: string;
    description: string;
    lat: number;
    lng: number;
    color: string;
    bg: string;
    time: string;
    is_verified: boolean;
    severity?: number;
    priority?: number;
}

export interface ReportRequest {
    user_id: string;
    description: string;
    title: string;
    lat: number;
    lng: number;
}

export interface User {
    id: string;
    name: string;
    credibility_score: number;
    role: "citizen" | "admin";
}
