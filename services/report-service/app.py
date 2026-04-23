import os
import google.genai as genai
from flask import Flask, request, jsonify

app = Flask(__name__)

# Initialize Gemini 2.5 (Make sure GEMINI_API_KEY is in your environment variables)
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# Use the latest Pro or Flash model depending on your speed/cost needs
# Flash is perfect for the "Flash Intelligence Layer" mentioned in your slides
model = genai.GenerativeModel('gemini-2.5-flash')

# In-memory store for verified nodes (To be replaced by Neo4j/Firestore later)
verified_nodes = []

def agentic_guardrail_check(description, location):
    """
    Uses Gemini to validate the report. 
    In a full production app, you'd also pass the image payload here.
    """
    prompt = f"""
    You are the CityPulse Sentinel Agent. Analyze the following citizen report.
    Location: {location}
    Description: {description}
    
    Tasks:
    1. Determine the category: 'hazard' or 'congestion'.
    2. Assess credibility (Is this a prank/spam, or a legitimate report?).
    3. Generate a concise, professional title for the map.
    
    Respond strictly in JSON format like this:
    {{"is_valid": true, "category": "hazard", "title": "Brief Title", "confidence": 0.9}}
    """
    
    try:
        response = model.generate_content(prompt)
        # Parse the JSON response (For brevity, assuming perfect JSON return here. 
        # In production, use Gemini's structured outputs feature)
        import json
        clean_text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(clean_text)
    except Exception as e:
        print(f"Agent analysis failed: {e}")
        return {"is_valid": False}

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "report-service"}), 200

@app.route('/api/v1/reports', methods=['POST'])
def submit_report():
    data = request.json
    description = data.get("description", "")
    location = data.get("title", "Unknown")
    
    print(f"Received raw report: {description}")
    
    # Run the Agentic Check
    analysis = agentic_guardrail_check(description, location)
    
    if not analysis.get("is_valid"):
        return jsonify({"status": "rejected", "message": "Failed security guardrails."}), 400
        
    # If valid, construct the verified node
    new_node = {
        "id": str(len(verified_nodes) + 1),
        "type": analysis.get("category", "hazard"),
        "title": analysis.get("title", location),
        "description": description,
        "lat": data.get("lat"),
        "lng": data.get("lng"),
        "color": "text-red-500" if analysis.get("category") == "hazard" else "text-amber-500",
        "bg": "bg-red-500/10" if analysis.get("category") == "hazard" else "bg-amber-500/10",
        "time": "Just now"
    }
    
    verified_nodes.append(new_node)
    
    # Placeholder for Phase 3.5: Neo4j update would happen here
    
    return jsonify({
        "status": "success", 
        "message": "Pulse report verified and published.", 
        "node": new_node
    }), 201

# Endpoint for Go API Gateway to fetch the dynamically verified nodes
@app.route('/api/v1/verified_nodes', methods=['GET'])
def get_verified_nodes():
    return jsonify(verified_nodes), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
