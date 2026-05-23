# services/ai_service.py
"""
CityLive Sentinel Agent — Agentic AI Service
Uses Gemini 2.5 Flash with native function calling for:
  1. analyze_report()      → Sentinel Agent (report triage + ValidationNode management)
  2. process_approval()    → Approval Agent (creates ApprovedNode after admin decision)
  3. generate_insights()   → Predictive Agent (city-wide risk analysis)
"""
import json
import uuid
import time
import google.genai as genai
from google.genai import types as genai_types
from typing import Dict, List
from core.config import config
from core.profiler import profiler


# Radius (km) per hazard type — best balance between over-clustering and fragmentation
HAZARD_RADIUS = {
    "Flooding":         2.0,
    "Waterlogging":     1.5,
    "Road Accident":    0.5,
    "Fire":             0.8,
    "Power Outage":     1.5,
    "Traffic Jam":      1.0,
    "Infrastructure":   1.0,
    "default":          1.0,
}


class AiService:
    def __init__(self, repository=None):
        self.client = genai.Client(api_key=config.GEMINI_API_KEY)
        self.repository = repository

    # ─────────────────────────────────────────────────────────────────────
    # SENTINEL AGENT — called after every new ReportNode is created
    # ─────────────────────────────────────────────────────────────────────

    def analyze_report(
        self, report_id: str, description: str, lat: float, lng: float
    ) -> Dict:
        """
        Agentic loop: AI autonomously decides whether to discard the report,
        create a new ValidationNode, or update an existing one.
        All decisions are made via tool calls — nothing is hardcoded.
        """

        # ── Tool definitions (closures capture lat/lng/report_id) ──────────

        def get_nearby_context(radius_km: float = 1.0) -> dict:
            """
            Fetch all ApprovedNodes, ValidationNodes, and ReportNodes within
            the specified radius of the current report's location.
            Returns a dict with keys: approved_nodes, validation_nodes, report_nodes.
            """
            return self.repository.get_nearby_context(lat, lng, radius_km)

        def create_validation_node(
            hazard_type: str,
            title: str,
            ai_explanation: str,
            severity: int,
            priority: int,
        ) -> dict:
            """
            Create a new ValidationNode in the graph for this emerging hazard cluster.
            Links the current ReportNode to it automatically.
            Returns the created ValidationNode data.
            severity: 1-10 (10 = most severe, e.g. fire, major flooding)
            priority: 1-10 (10 = most urgent, based on hazard type and urgency language)
            """
            return self.repository.create_validation_node(
                report_id=report_id,
                lat=lat, lng=lng,
                hazard_type=hazard_type,
                title=title,
                ai_explanation=ai_explanation,
                severity=severity,
                priority=priority,
            )

        def update_validation_node(
            validation_id: str,
            new_severity: int,
            new_priority: int,
            updated_explanation: str,
        ) -> dict:
            """
            Update an existing ValidationNode when this report corroborates it.
            Increments report_count, recalculates severity/priority, and
            links the current ReportNode to it.
            Returns the updated ValidationNode data.
            """
            return self.repository.update_validation_node(
                validation_id=validation_id,
                report_id=report_id,
                new_severity=new_severity,
                new_priority=new_priority,
                updated_explanation=updated_explanation,
            )

        # ── System prompt ──────────────────────────────────────────────────

        system_instruction = f"""
You are the CityLive Sentinel Agent — an autonomous AI that triages incoming
citizen hazard reports for a smart city platform.

A new ReportNode has just been created:
  - ID: {report_id}
  - Description: "{description}"
  - Location: ({lat}, {lng})

YOUR DECISION PROCESS (follow strictly, in order):

STEP 1 — FETCH CONTEXT
  Call get_nearby_context() with an appropriate radius for the likely hazard type.
  Default radius = 1.0 km. Use 2.0 km for large-area events (flooding, power outage).
  Use 0.5 km for highly localized events (accidents, potholes).

STEP 2 — CHECK FOR ACTIVE APPROVED NODES
  Examine the approved_nodes in the context.
  If any ApprovedNode covers the SAME hazard type and is_active = true:
    → This report is REDUNDANT. Return:
      {{"action": "discard", "reason": "Covered by active ApprovedNode <id>"}}
    Do NOT call any other tool.

STEP 3 — CHECK FOR EXISTING VALIDATION NODES
  Examine the validation_nodes in the context.
  If a ValidationNode exists that is EITHER the same hazard type OR logically caused by/related to this new report (e.g., a traffic jam caused by nearby flooding):
    → Call update_validation_node() with:
        - The ValidationNode's id
        - Recalculated severity (factor in corroboration — same hazard reported again = +1 severity, max 10)
        - Recalculated priority (each additional report adds urgency — add 1, max 10)
        - A fresh ai_explanation that incorporates ALL linked reports, explicitly noting the relationship (e.g., "Flooding has now caused a severe traffic jam in the area").
    → After the tool returns, return:
      {{"action": "updated_validation", "validation_id": "<id>", "severity": N, "priority": N}}

STEP 4 — CREATE A NEW VALIDATION NODE
  If no matching ValidationNode exists, this is a NEW cluster.
  Call create_validation_node() with:
    - hazard_type: single clear category (e.g. "Flooding", "Road Accident", "Fire", "Power Outage", "Traffic Jam", "Infrastructure")
    - title: short, clear title (max 8 words, e.g. "Severe flooding near MG Road underpass")
    - ai_explanation: 2-3 sentence analysis explaining why this report seems legitimate, the hazard severity, and what city action may be needed
    - severity: 1-10
    - priority: 1-10
  → After the tool returns, return:
    {{"action": "created_validation", "validation_id": "<id>", "severity": N, "priority": N}}

SEVERITY GUIDE:
  1-3: Minor (small pothole, mild traffic)
  4-6: Moderate (road accident, waterlogging)
  7-9: Severe (major flooding, fire)
  10:  Critical (immediate life threat)

PRIORITY GUIDE:
  Priority = urgency of admin action needed. Factor: hazard type + time sensitivity.
  Start: severity - 1. Increment by 1 for each additional corroborating report (max 10).

IMPORTANT:
  - You MUST call tools. Do not attempt to return a final answer without first calling get_nearby_context.
  - Be concise and precise in ai_explanation — admins rely on it to make decisions.
  - If the description is gibberish, a test, or clearly not a real hazard → return:
    {{"action": "discard", "reason": "Not a valid hazard report"}}
"""

        try:
            t_start = time.perf_counter()

            chat = self.client.chats.create(
                model="gemini-2.5-flash",
                config=genai_types.GenerateContentConfig(
                    tools=[get_nearby_context, create_validation_node, update_validation_node],
                    system_instruction=system_instruction,
                    temperature=0.2,  # Low temp for deterministic triage decisions
                ),
            )

            response = chat.send_message(
                f"Triage this report: ID={report_id}, description='{description}'"
            )

            elapsed_ms = (time.perf_counter() - t_start) * 1000
            print(f"[PROFILE][SentinalAgent] latency={elapsed_ms:.1f}ms report_id={report_id}")
            profiler.record("sentinel_agent", elapsed_ms)   

            # Parse the agent's final JSON decision
            raw_text = response.text.strip()
            # Strip markdown code fences if present
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
            raw_text = raw_text.strip()

            try:
                decision = json.loads(raw_text)
            except json.JSONDecodeError:
                # Agent returned free text — treat as a valid processed report
                decision = {"action": "processed", "raw": raw_text}

            action = decision.get("action", "processed")
            if action == "discard":
                return {
                    "is_valid": False,
                    "action": "discard",
                    "reason": decision.get("reason", "AI discarded"),
                }

            return {
                "is_valid": True,
                "action": action,
                "validation_id": decision.get("validation_id"),
                "severity": decision.get("severity"),
                "priority": decision.get("priority"),
            }

        except Exception as e:
            print(f"[SentinelAgent] Error during analysis: {e}")
            return {"is_valid": False, "action": "error", "reason": str(e)}

    # ─────────────────────────────────────────────────────────────────────
    # APPROVAL AGENT — called when admin approves a ValidationNode
    # ─────────────────────────────────────────────────────────────────────

    def process_approval(
        self,
        validation_id: str,
        admin_id: str,
        admin_explanation: str,
        validation_data: Dict,
    ) -> Dict:
        """
        Agentic approval flow: AI reviews the ValidationNode + admin reasoning,
        writes post-approval notes, then calls create_approved_node.
        """

        def create_approved_node(
            ai_post_approval_notes: str,
        ) -> dict:
            """
            Finalize the admin approval by creating an ApprovedNode in the graph.
            This will broadcast a live red marker to all users on the map.
            ai_post_approval_notes: 1-2 sentences of AI commentary on the approval
              (e.g. recommended city response, estimated duration of hazard).
            """
            return self.repository.create_approved_node(
                validation_id=validation_id,
                admin_id=admin_id,
                admin_explanation=admin_explanation,
                ai_post_approval_notes=ai_post_approval_notes,
            )

        system_instruction = f"""
You are the CityLive Approval Agent. An administrator has approved a hazard report cluster.

ValidationNode details:
  - ID: {validation_id}
  - Hazard: {validation_data.get('hazard_type')}
  - Title: {validation_data.get('title')}
  - AI Explanation: {validation_data.get('ai_explanation')}
  - Severity: {validation_data.get('severity')}/10
  - Priority: {validation_data.get('priority')}/10
  - Report Count: {validation_data.get('report_count')}
  - Location: ({validation_data.get('lat')}, {validation_data.get('lng')})

Admin ID: {admin_id}
Admin Explanation: "{admin_explanation}"

YOUR TASK:
1. Write 1-2 sentences of ai_post_approval_notes covering:
   - What city response is recommended (e.g. "Dispatch drainage crew", "Alert traffic police")
   - Estimated duration/impact if known
2. Call create_approved_node() with your ai_post_approval_notes.
3. Return {{"status": "approved", "approved_id": "<id from tool result>"}}
"""

        try:
            t_start = time.perf_counter()

            chat = self.client.chats.create(
                model="gemini-2.5-flash",
                config=genai_types.GenerateContentConfig(
                    tools=[create_approved_node],
                    system_instruction=system_instruction,
                    temperature=0.3,
                ),
            )
            response = chat.send_message("Process this admin approval now.")

            elapsed_ms = (time.perf_counter() - t_start) * 1000
            print(f"[PROFILE][ApprovalAgent] latency={elapsed_ms:.1f}ms  validation_id={validation_id}")
            profiler.record("approval_agent", elapsed_ms)

            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
            raw_text = raw_text.strip()

            try:
                result = json.loads(raw_text)
                return {"success": True, "approved_id": result.get("approved_id")}
            except json.JSONDecodeError:
                return {"success": True, "raw": raw_text}

        except Exception as e:
            print(f"[ApprovalAgent] Error: {e}")
            # Fallback: create ApprovedNode directly without AI notes
            node = self.repository.create_approved_node(
                validation_id=validation_id,
                admin_id=admin_id,
                admin_explanation=admin_explanation,
                ai_post_approval_notes="Approved by administrator.",
            )
            return {"success": True, "approved_node": node, "fallback": True}

    # ─────────────────────────────────────────────────────────────────────
    # PREDICTIVE AGENT — generates city-wide risk insights
    # ─────────────────────────────────────────────────────────────────────

    def generate_insights(self, context_nodes: List[Dict]) -> List[Dict]:
        """
        Analyzes all active ApprovedNodes and predicts cascading risks,
        secondary disruptions, or emerging patterns.
        """
        if not context_nodes:
            return [{
                "title": "City Operating Normally",
                "description": "No active verified hazards. All systems nominal.",
            }]

        prompt = f"""
You are the CityLive Predictive Agent analyzing active city hazards.

Active ApprovedNodes (verified hazards):
{json.dumps(context_nodes, indent=2, default=str)}

Identify 1-3 potential cascading effects, secondary risks, or patterns.
Respond ONLY with a valid JSON array, no markdown:
[
  {{
    "title": "Short warning title",
    "description": "2-sentence explanation of the forecasted risk and recommended action."
  }}
]
"""
        try:
            t_start = time.perf_counter()

            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=genai_types.GenerateContentConfig(temperature=0.4),
            )

            elapsed_ms = (time.perf_counter() - t_start) * 1000
            print(f"[PROFILE][PredictiveAgent] latency={elapsed_ms:.1f}ms")
            profiler.record("predictive_agent", elapsed_ms)

            clean = response.text.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            return json.loads(clean.strip())
        except Exception as e:
            print(f"[PredictiveAgent] Error: {e}")
            return [{"title": "Analysis Unavailable", "description": "Predictive engine temporarily offline."}]
