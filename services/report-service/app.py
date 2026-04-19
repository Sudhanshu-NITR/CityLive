from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "report-service"}), 200

@app.route('/api/v1/reports', methods=['POST'])
def submit_report():
    data = request.json
    
    # Placeholder for Phase 3: Gemini 2.5 classification, Firestore insertion, Neo4j update
    
    return jsonify({
        "status": "success", 
        "message": "Pulse report received.", 
        "report_data": data
    }), 201

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)