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
}

export interface ReportRequest {
    user_id: string;
    description: string;
    title: string;
    lat: number;
    lng: number;
}
