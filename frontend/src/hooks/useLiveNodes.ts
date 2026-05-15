// src/hooks/useLiveNodes.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import { ApprovedNode, ValidationNode, SSEEvent } from "../types";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "/api";

interface LiveState {
    approvedNodes: ApprovedNode[];
    validationNodes: ValidationNode[];
}

/**
 * useLiveNodes — connects to the SSE stream and maintains live state for
 * both ApprovedNodes (user map red markers) and ValidationNodes (admin yellow markers).
 *
 * @param initialApproved  Pre-fetched ApprovedNodes from REST API
 * @param initialValidation Pre-fetched ValidationNodes from REST API (admin only)
 */
export function useLiveNodes(
    initialApproved: ApprovedNode[] = [],
    initialValidation: ValidationNode[] = []
): LiveState & {
    upsertValidation: (node: ValidationNode) => void;
    removeValidation: (id: string) => void;
} {
    const [approvedNodes, setApprovedNodes] = useState<ApprovedNode[]>(initialApproved);
    const [validationNodes, setValidationNodes] = useState<ValidationNode[]>(initialValidation);

    // Derived state pattern to sync initial data without useEffect warnings
    const [prevInitialApproved, setPrevInitialApproved] = useState(initialApproved);
    if (initialApproved !== prevInitialApproved) {
        setApprovedNodes(initialApproved);
        setPrevInitialApproved(initialApproved);
    }

    const [prevInitialValidation, setPrevInitialValidation] = useState(initialValidation);
    if (initialValidation !== prevInitialValidation) {
        setValidationNodes(initialValidation);
        setPrevInitialValidation(initialValidation);
    }

    // ── SSE Connection ───────────────────────────────────────────────────
    useEffect(() => {
        let source: EventSource;
        let retryTimeout: ReturnType<typeof setTimeout>;

        const connect = () => {
            source = new EventSource(`${GATEWAY_URL}/stream`);

            source.onmessage = (event) => {
                try {
                    const data: SSEEvent = JSON.parse(event.data);

                    switch (data.type) {
                        case "NEW_APPROVED_NODE":
                            // A new red marker — add to approved list, remove from validation queue
                            setApprovedNodes((prev) => {
                                if (prev.some((n) => n.id === data.payload.id)) return prev;
                                return [data.payload, ...prev];
                            });
                            setValidationNodes((prev) =>
                                prev.filter((v) => v.id !== data.payload.validation_node_id)
                            );
                            break;

                        case "VALIDATION_UPDATED":
                            // New or updated yellow marker (AI created/updated a cluster)
                            setValidationNodes((prev) => {
                                const exists = prev.find((v) => v.id === data.payload.id);
                                if (exists) {
                                    return prev.map((v) =>
                                        v.id === data.payload.id ? data.payload : v
                                    );
                                }
                                return [data.payload, ...prev];
                            });
                            break;

                        case "VALIDATION_REJECTED":
                            // Admin rejected — remove from validation list
                            setValidationNodes((prev) =>
                                prev.filter((v) => v.id !== data.payload.id)
                            );
                            break;

                        default:
                            break;
                    }
                } catch (err) {
                    console.error("[useLiveNodes] Failed to parse SSE data:", err);
                }
            };

            source.onerror = () => {
                console.warn("[useLiveNodes] SSE disconnected. Reconnecting in 3s...");
                source.close();
                retryTimeout = setTimeout(connect, 3000); // Auto-reconnect
            };
        };

        connect();

        return () => {
            source?.close();
            clearTimeout(retryTimeout);
        };
    }, []);

    // ── Manual state helpers (for optimistic admin UI updates) ───────────
    const upsertValidation = useCallback((node: ValidationNode) => {
        setValidationNodes((prev) => {
            const exists = prev.find((v) => v.id === node.id);
            if (exists) return prev.map((v) => (v.id === node.id ? node : v));
            return [node, ...prev];
        });
    }, []);

    const removeValidation = useCallback((id: string) => {
        setValidationNodes((prev) => prev.filter((v) => v.id !== id));
    }, []);

    return { approvedNodes, validationNodes, upsertValidation, removeValidation };
}
