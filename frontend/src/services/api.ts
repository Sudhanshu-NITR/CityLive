// src/services/api.ts
import { PulseNode, ReportRequest } from '../types';

// Always route through the API Gateway
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080';

export const apiClient = {

    // Fetch all verified nodes for the map/feed
    getNodes: async (): Promise<PulseNode[]> => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/nodes`);
        if (!res.ok) throw new Error('Failed to fetch nodes');
        return res.json();
    },

    // Submit a new citizen report
    submitReport: async (report: ReportRequest) => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Failed to submit report');
        }
        return res.json();
    },

    // Get predictive insights from AI
    getInsights: async () => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/ai-insights`);
        if (!res.ok) throw new Error('Failed to fetch insights');
        return res.json();
    },

    // Get all users for the switcher
    getUsers: async () => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/users`);
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    }
};
