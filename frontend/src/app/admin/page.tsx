// src/app/admin/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import CityMap from "@/components/CityMap";
import { ValidationNode, ApprovedNode, ReportNode } from "@/types";
import {
    ShieldAlert, BrainCircuit, Activity, ChevronRight, AlertTriangle,
    CheckCircle2, XCircle, Loader2, MapPin, Clock, Users, ChevronDown
} from "lucide-react";
import { apiClient } from "@/services/api";
import { useLiveNodes } from "@/hooks/useLiveNodes";
import { useUser } from "@/hooks/useUser";
import UserSwitcher from "@/components/UserSwitcher";

export default function AdminDashboard() {
    const router = useRouter();
    const { user } = useUser();

    // ── Role Guard — block non-admins ─────────────────────────────────────
    useEffect(() => {
        const saved = localStorage.getItem("citylive_current_user");
        if (saved) {
            try {
                const u = JSON.parse(saved);
                if (u.role !== "admin") {
                    router.replace("/");
                    return;
                }
            } catch (_) {
                router.replace("/");
            }
        } else {
            // No user at all — redirect
            router.replace("/");
        }
    }, [router]);

    // ── Data state ────────────────────────────────────────────────────────
    const [initialValidation, setInitialValidation] = useState<ValidationNode[]>([]);
    const [initialApproved, setInitialApproved] = useState<ApprovedNode[]>([]);
    const [insights, setInsights] = useState<{ title: string; description: string }[]>([]);
    const [loading, setLoading] = useState(true);

    // Selected card state
    const [selectedNode, setSelectedNode] = useState<ValidationNode | null>(null);
    const [linkedReports, setLinkedReports] = useState<ReportNode[]>([]);
    const [hoveredReport, setHoveredReport] = useState<ReportNode | null>(null);
    const [loadingReports, setLoadingReports] = useState(false);

    // Action state
    const [actionLoading, setActionLoading] = useState<string | null>(null); // validation_id

    useEffect(() => {
        const load = async () => {
            try {
                const [validation, approved, aiInsights] = await Promise.all([
                    apiClient.getValidationNodes(),
                    apiClient.getApprovedNodes(),
                    apiClient.getInsights().catch(() => []),
                ]);
                setInitialValidation(validation || []);
                setInitialApproved(approved || []);
                setInsights(aiInsights || []);
            } catch (err) {
                console.error("Admin data load failed:", err);
            } finally {
                setLoading(false);
            }
        };
        load();

        // Refresh insights every 30s
        const iv = setInterval(async () => {
            const aiInsights = await apiClient.getInsights().catch(() => []);
            setInsights(aiInsights);
        }, 30000);
        return () => clearInterval(iv);
    }, []);

    const { approvedNodes, validationNodes, removeValidation } = useLiveNodes(
        initialApproved,
        initialValidation
    );

    // ── Select a ValidationNode — fetch its linked reports ────────────────
    const selectNode = useCallback(async (node: ValidationNode) => {
        setSelectedNode(node);
        setHoveredReport(null);
        setLoadingReports(true);
        try {
            const reports = await apiClient.getReportsForValidation(node.id);
            setLinkedReports(reports);
        } catch (err) {
            console.error("Failed to fetch linked reports:", err);
            setLinkedReports([]);
        } finally {
            setLoadingReports(false);
        }
    }, []);

    // ── Admin: Approve ────────────────────────────────────────────────────
    const handleApprove = async (node: ValidationNode) => {
        if (!user) return;
        setActionLoading(node.id);
        try {
            await apiClient.approveValidation(node.id, user.id, "Reviewed and confirmed by admin.");
            removeValidation(node.id);
            if (selectedNode?.id === node.id) setSelectedNode(null);
        } catch (err: any) {
            alert(`Approval failed: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    // ── Admin: Reject ─────────────────────────────────────────────────────
    const handleReject = async (node: ValidationNode) => {
        if (!user) return;
        setActionLoading(node.id);
        try {
            await apiClient.rejectValidation(node.id, user.id);
            removeValidation(node.id);
            if (selectedNode?.id === node.id) setSelectedNode(null);
        } catch (err: any) {
            alert(`Rejection failed: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const severityColor = (s: number) =>
        s >= 8 ? "text-red-400 bg-red-500/10 border-red-500/20"
        : s >= 5 ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
        : "text-green-400 bg-green-500/10 border-green-500/20";

    return (
        <main className="relative w-full h-screen overflow-hidden bg-black text-white">
            {/* Background Map — shows both ValidationNodes (yellow) and ApprovedNodes (red) */}
            <div className="absolute inset-0 z-0">
                <CityMap
                    approvedNodes={approvedNodes}
                    validationNodes={validationNodes}
                    hoveredReport={hoveredReport}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 pointer-events-none" />
            </div>

            {/* Foreground UI */}
            <div className="relative z-10 flex flex-col h-full p-5 pointer-events-none gap-4">

                {/* Top Nav */}
                <header className="flex items-center bg-black/40 border border-white/10 px-5 py-4 rounded-2xl backdrop-blur-2xl shadow-2xl pointer-events-auto">
                    <div className="flex items-center gap-3 w-1/4">
                        <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                            <Activity className="text-blue-400 w-5 h-5 animate-pulse" />
                        </div>
                        <h1 className="text-xl font-bold text-white">
                            City<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Live</span>
                            <span className="text-gray-500 font-light ml-2 text-base">| Command Center</span>
                        </h1>
                    </div>
                    <div className="flex-1 flex justify-center gap-8 text-sm font-semibold text-gray-400">
                        <a href="#" className="text-white">Live Map</a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">Analytics</a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">AI Insights</a>
                    </div>
                    <div className="w-1/4 flex justify-end">
                        <UserSwitcher />
                    </div>
                </header>

                {/* Main Columns */}
                <div className="flex-1 flex gap-5 overflow-hidden">

                    {/* ── LEFT: Validation Queue ─────────────────────────────────────── */}
                    <div className="w-[380px] flex flex-col gap-4 pointer-events-auto h-full overflow-hidden">

                        {/* Stats row */}
                        <div className="grid grid-cols-2 gap-3 shrink-0">
                            <StatCard
                                icon={<AlertTriangle size={18} className="text-amber-400" />}
                                count={validationNodes.length}
                                label="Pending Review"
                                color="amber"
                            />
                            <StatCard
                                icon={<ShieldAlert size={18} className="text-red-400" />}
                                count={approvedNodes.length}
                                label="Live Hazards"
                                color="red"
                            />
                        </div>

                        {/* ValidationNode List */}
                        <div className="flex-1 flex flex-col bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent shrink-0">
                                <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                                    <BrainCircuit size={16} />
                                    AI Validation Queue
                                </h2>
                                <p className="text-[11px] text-gray-500 mt-0.5">Sorted by severity + priority</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full gap-2 text-gray-500">
                                        <Loader2 size={18} className="animate-spin text-amber-500" />
                                        <span className="text-xs">Loading queue...</span>
                                    </div>
                                ) : validationNodes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                                        <CheckCircle2 size={32} className="text-green-500/40" />
                                        <p className="text-gray-400 text-sm font-medium">Queue Clear</p>
                                        <p className="text-gray-600 text-xs">No pending validation nodes.</p>
                                    </div>
                                ) : (
                                    validationNodes.map((node) => (
                                        <ValidationCard
                                            key={node.id}
                                            node={node}
                                            isSelected={selectedNode?.id === node.id}
                                            isActioning={actionLoading === node.id}
                                            onSelect={() => selectNode(node)}
                                            onApprove={() => handleApprove(node)}
                                            onReject={() => handleReject(node)}
                                            severityColor={severityColor}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Report Detail + AI Insights ────────────────────────── */}
                    <div className="w-[380px] flex flex-col gap-4 pointer-events-auto h-full overflow-hidden">

                        {/* Selected ValidationNode detail */}
                        {selectedNode ? (
                            <div className="flex-1 flex flex-col bg-black/40 backdrop-blur-2xl border border-amber-500/20 rounded-2xl shadow-2xl overflow-hidden">
                                <div className="p-4 border-b border-amber-500/10 bg-gradient-to-br from-amber-900/20 to-transparent shrink-0">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                                {selectedNode.hazard_type}
                                            </span>
                                            <h3 className="text-sm font-bold text-white mt-1.5 leading-snug">{selectedNode.title}</h3>
                                        </div>
                                        <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white transition p-1">
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">{selectedNode.ai_explanation}</p>
                                    <div className="flex gap-2 mt-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${severityColor(selectedNode.severity)}`}>SEV {selectedNode.severity}/10</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded border font-bold text-blue-400 bg-blue-500/10 border-blue-500/20">PRI {selectedNode.priority}/10</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded border font-bold text-gray-400 bg-white/5 border-white/10 flex items-center gap-1">
                                            <Users size={9} /> {selectedNode.report_count}
                                        </span>
                                    </div>
                                </div>

                                {/* Linked Reports */}
                                <div className="flex-1 overflow-y-auto scrollbar-hide">
                                    <div className="px-4 py-3 border-b border-white/5">
                                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                            Linked Reports ({linkedReports.length})
                                        </h4>
                                    </div>
                                    {loadingReports ? (
                                        <div className="flex items-center justify-center p-8 gap-2 text-gray-500">
                                            <Loader2 size={16} className="animate-spin" />
                                            <span className="text-xs">Loading reports...</span>
                                        </div>
                                    ) : (
                                        <div className="p-3 space-y-2">
                                            {linkedReports.map((report) => (
                                                <div
                                                    key={report.id}
                                                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-green-500/5 hover:border-green-500/20 transition cursor-pointer group"
                                                    onMouseEnter={() => setHoveredReport(report)}
                                                    onMouseLeave={() => setHoveredReport(null)}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <MapPin size={12} className="text-green-400 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-gray-300 leading-snug">{report.description}</p>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                <span className="text-[10px] text-gray-500">by {report.user_id}</span>
                                                                <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                                                                    <Clock size={8} />
                                                                    {report.timestamp
                                                                        ? new Date(report.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                                                        : "—"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Approve / Reject */}
                                <div className="p-4 border-t border-white/5 flex gap-3 shrink-0">
                                    <button
                                        onClick={() => handleReject(selectedNode)}
                                        disabled={!!actionLoading}
                                        className="flex-1 py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    >
                                        {actionLoading === selectedNode.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(selectedNode)}
                                        disabled={!!actionLoading}
                                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-semibold shadow-[0_0_16px_rgba(34,197,94,0.25)] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    >
                                        {actionLoading === selectedNode.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                        Approve
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Placeholder when nothing selected */
                            <div className="flex-1 flex flex-col items-center justify-center bg-black/20 border border-dashed border-white/10 rounded-2xl gap-3 text-center p-6">
                                <ChevronRight size={28} className="text-gray-600" />
                                <p className="text-sm text-gray-500 font-medium">Select a validation node</p>
                                <p className="text-xs text-gray-600">Click any item in the queue to review linked reports and take action.</p>
                            </div>
                        )}

                        {/* AI Insights */}
                        <div className="bg-black/40 backdrop-blur-2xl border border-purple-500/20 rounded-2xl shadow-2xl shadow-purple-900/10 overflow-hidden shrink-0 max-h-[240px]">
                            <div className="p-4 border-b border-purple-500/10 bg-gradient-to-br from-purple-900/20 to-transparent">
                                <h2 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                    <BrainCircuit size={14} />
                                    Sentinel AI Insights
                                </h2>
                            </div>
                            <div className="p-3 space-y-2 overflow-y-auto max-h-[160px] scrollbar-hide">
                                {insights.length === 0 ? (
                                    <div className="flex items-center gap-2 justify-center py-4">
                                        <BrainCircuit size={16} className="text-purple-500/40 animate-pulse" />
                                        <span className="text-xs text-gray-500">Analyzing city data...</span>
                                    </div>
                                ) : (
                                    insights.map((ins, i) => (
                                        <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-purple-500/5 transition cursor-pointer">
                                            <div className="flex items-center gap-2 mb-1">
                                                <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                                                <span className="text-xs font-semibold text-gray-200">{ins.title}</span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 leading-relaxed pl-5">{ins.description}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, count, label, color }: {
    icon: React.ReactNode; count: number; label: string; color: "amber" | "red";
}) {
    const colors = {
        amber: "border-amber-500/20 shadow-amber-900/10",
        red:   "border-red-500/20 shadow-red-900/10",
    };
    return (
        <div className={`bg-black/40 border ${colors[color]} rounded-xl p-4 backdrop-blur-md shadow-lg`}>
            <div className="mb-2">{icon}</div>
            <div className="text-2xl font-bold text-white">{count}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">{label}</div>
        </div>
    );
}

function ValidationCard({ node, isSelected, isActioning, onSelect, onApprove, onReject, severityColor }: {
    node: ValidationNode;
    isSelected: boolean;
    isActioning: boolean;
    onSelect: () => void;
    onApprove: () => void;
    onReject: () => void;
    severityColor: (s: number) => string;
}) {
    return (
        <div
            className={`rounded-xl border transition-all cursor-pointer ${
                isSelected
                    ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-900/20"
                    : "bg-white/5 border-white/5 hover:bg-white/8 hover:border-white/10"
            }`}
            onClick={onSelect}
        >
            <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0">
                        {node.hazard_type}
                    </span>
                    <div className="flex gap-1.5 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${severityColor(node.severity)}`}>
                            S{node.severity}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold text-blue-400 bg-blue-500/10 border-blue-500/20">
                            P{node.priority}
                        </span>
                    </div>
                </div>
                <p className="text-xs font-semibold text-gray-200 leading-snug">{node.title}</p>
                <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-snug">{node.ai_explanation}</p>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-600 flex items-center gap-1">
                        <Users size={9} /> {node.report_count} report{node.report_count !== 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={onReject}
                            disabled={isActioning}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition disabled:opacity-50"
                        >
                            {isActioning ? <Loader2 size={10} className="animate-spin" /> : "Reject"}
                        </button>
                        <button
                            onClick={onApprove}
                            disabled={isActioning}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 transition disabled:opacity-50"
                        >
                            {isActioning ? <Loader2 size={10} className="animate-spin" /> : "Approve"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
