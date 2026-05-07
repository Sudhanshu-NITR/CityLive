// src/services/api.ts
import { ApprovedNode, ValidationNode, ReportNode, ReportRequest, User } from "../types";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8080";

// ── Build headers with current user context (for gateway middleware) ────────
function authHeaders(): HeadersInit {
    if (typeof window === "undefined") return { "Content-Type": "application/json" };
    try {
        const saved = localStorage.getItem("citylive_current_user");
        if (saved) {
            const user: User = JSON.parse(saved);
            return {
                "Content-Type": "application/json",
                "X-User-Id": user.id,
                "X-User-Role": user.role,
            };
        }
    } catch (_) {}
    return { "Content-Type": "application/json" };
}

export const apiClient = {

    // ── USER MAP ─────────────────────────────────────────────────────────

    /** All admin-verified active hazards (large red markers) */
    getApprovedNodes: async (): Promise<ApprovedNode[]> => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/approved_nodes`);
        if (!res.ok) throw new Error("Failed to fetch approved nodes");
        return res.json();
    },

    /** Submit a citizen hazard report */
    submitReport: async (report: ReportRequest) => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/reports`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(report),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: "Unknown error" }));
            throw new Error(err.detail || "Failed to submit report");
        }
        return res.json();
    },

    // ── ADMIN DASHBOARD ──────────────────────────────────────────────────

    /** All pending ValidationNodes (yellow markers + admin queue) */
    getValidationNodes: async (): Promise<ValidationNode[]> => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/validation_nodes`, {
            headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Failed to fetch validation nodes");
        return res.json();
    },

    /** All ReportNodes linked to a specific ValidationNode */
    getReportsForValidation: async (validationId: string): Promise<ReportNode[]> => {
        const res = await fetch(
            `${GATEWAY_URL}/api/v1/validation/${validationId}/reports`,
            { headers: authHeaders() }
        );
        if (!res.ok) throw new Error("Failed to fetch reports");
        return res.json();
    },

    /** Admin approve: triggers Approval Agent → creates ApprovedNode → SSE broadcast */
    approveValidation: async (
        validationId: string,
        adminId: string,
        explanation: string
    ) => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/admin/validate/${validationId}`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ action: "approve", admin_id: adminId, explanation }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: "Unknown error" }));
            throw new Error(err.detail || "Approval failed");
        }
        return res.json();
    },

    /** Admin reject: marks ValidationNode + linked ReportNodes as discarded */
    rejectValidation: async (validationId: string, adminId: string) => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/admin/validate/${validationId}`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ action: "reject", admin_id: adminId, explanation: "" }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: "Unknown error" }));
            throw new Error(err.detail || "Rejection failed");
        }
        return res.json();
    },

    // ── SHARED ───────────────────────────────────────────────────────────

    /** Predictive AI insights based on active ApprovedNodes */
    getInsights: async (): Promise<{ title: string; description: string }[]> => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/ai-insights`);
        if (!res.ok) throw new Error("Failed to fetch insights");
        return res.json();
    },

    /** All users (for UserSwitcher) */
    getUsers: async (): Promise<User[]> => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/users`);
        if (!res.ok) throw new Error("Failed to fetch users");
        return res.json();
    },
};
