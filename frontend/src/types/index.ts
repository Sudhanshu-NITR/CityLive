// src/types/index.ts

// ── Raw citizen report ─────────────────────────────────────────────────────
export interface ReportNode {
    id: string;
    description: string;
    lat: number;
    lng: number;
    user_id: string;
    timestamp: string;
    status: "pending" | "discarded" | "clustered";
}

// ── AI-created cluster of reports ──────────────────────────────────────────
export interface ValidationNode {
    id: string;
    hazard_type: string;
    title: string;
    description?: string;
    ai_explanation: string;
    priority: number;        // 1–10
    severity: number;        // 1–10
    report_count: number;
    lat: number;
    lng: number;
    status: "pending_admin_review" | "approved" | "rejected";
    created_at: string;
    updated_at: string;
    linked_reports?: ReportNode[];
}

// ── Admin-verified live hazard ─────────────────────────────────────────────
export interface ApprovedNode {
    id: string;
    validation_node_id: string;
    admin_id: string;
    admin_explanation: string;
    ai_post_approval_notes?: string;
    hazard_type: string;
    title: string;
    severity: number;
    lat: number;
    lng: number;
    is_active: boolean;
    approved_at: string;
}

// ── User entity ────────────────────────────────────────────────────────────
export interface User {
    id: string;
    name: string;
    credibility_score: number;
    role: "citizen" | "admin";
}

// ── Legacy alias kept for UserSwitcher ────────────────────────────────────
export type ReportRequest = {
    user_id: string;
    description: string;
    lat: number;
    lng: number;
};

// ── SSE event envelope ─────────────────────────────────────────────────────
export type SSEEvent =
    | { type: "NEW_APPROVED_NODE"; payload: ApprovedNode }
    | { type: "VALIDATION_UPDATED"; payload: ValidationNode }
    | { type: "VALIDATION_REJECTED"; payload: { id: string } };
