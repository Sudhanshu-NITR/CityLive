import os
import uuid
import google.genai as genai
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from neo4j import GraphDatabase

app = Flask(__name__)

# load the environment variables
load_dotenv()

# Initialize Gemini 2.5 (Make sure GEMINI_API_KEY is in your environment variables)
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# In-memory store for verified nodes (To be replaced by Neo4j/Firestore later)
verified_nodes = []

NEO4J_URI = os.environ.get("NEO4J_URI")
NEO4J_USERNAME = os.environ.get("NEO4J_USERNAME", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD")

# --- Neo4j Connection ---
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

def close_driver():
    driver.close()


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
    2. Assess credibility.
    3. Generate a concise title.
    
    Respond strictly in JSON format like this:
    {{"is_valid": true, "category": "hazard", "title": "Brief Title"}}
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        # Parse the JSON response (For brevity, assuming perfect JSON return here. 
        # In production, use Gemini's structured outputs feature)
        import json
        clean_text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(clean_text)
    except Exception as e:
        print(f"Agent analysis failed: {e}")
        return {"is_valid": False}


# --- Endpoints ---
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200
    
@app.route('/api/v1/reports', methods=['POST'])
def submit_report():
    data = request.json
    description = data.get("description", "")
    location = data.get("title", "Unknown")
    
    # 1. Agent validates the report
    analysis = agentic_guardrail_check(description, location)
    if not analysis.get("is_valid"):
        return jsonify({"status": "rejected", "message": "Failed security guardrails."}), 400
        
    category = analysis.get("category", "hazard")
    color = "text-red-500" if category == "hazard" else "text-amber-500"
    bg = "bg-red-500/10" if category == "hazard" else "bg-amber-500/10"
    
    new_id = str(uuid.uuid4())[:8]

    # 2. Write to Neo4j Graph Database
    cypher_query = """
    CREATE (n:PulseNode {
        id: $id,
        type: $type,
        title: $title,
        description: $description,
        lat: $lat,
        lng: $lng,
        color: $color,
        bg: $bg,
        time: "Just now"
    })
    RETURN n
    """
    
    with driver.session() as session:
        result = session.run(cypher_query, 
            id=new_id, type=category, title=analysis.get("title", location),
            description=description, lat=data.get("lat"), lng=data.get("lng"),
            color=color, bg=bg
        )
        record = result.single()
        node_data = dict(record["n"])
    return jsonify({
        "status": "success", 
        "message": "Pulse report verified and saved to Graph.", 
        "node": node_data
    }), 201

@app.route('/api/v1/verified_nodes', methods=['GET'])
def get_verified_nodes():

    # Fetch all nodes from the Graph Database
    cypher_query = "MATCH (n:PulseNode) RETURN n"
    
    nodes = []
    try:
        with driver.session() as session:
            result = session.run(cypher_query)
            for record in result:
                nodes.append(dict(record["n"]))
        return jsonify(nodes), 200
    except Exception as e:
        print(f"Failed to fetch from Neo4j: {e}")
        return jsonify([]), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)