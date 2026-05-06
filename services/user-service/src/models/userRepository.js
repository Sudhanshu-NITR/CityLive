// src/models/userRepository.js

// In-memory mock database
const users = {
    "citizen_001": { id: "citizen_001", name: "Priya Sharma", credibility_score: 85, role: "citizen" },
    "citizen_002": { id: "citizen_002", name: "Rahul Verma", credibility_score: 92, role: "citizen" },
    "citizen_003": { id: "citizen_003", name: "Ananya Iyer", credibility_score: 78, role: "citizen" },
    "citizen_004": { id: "citizen_004", name: "Rohan Desai", credibility_score: 65, role: "citizen" },
    "citizen_005": { id: "citizen_005", name: "Neha Gupta", credibility_score: 110, role: "citizen" },
    "admin_001": { id: "admin_001", name: "Commander Mehta", credibility_score: 999, role: "admin" },
    "admin_002": { id: "admin_002", name: "Officer Singh", credibility_score: 999, role: "admin" },
    "admin_003": { id: "admin_003", name: "Chief Reddy", credibility_score: 999, role: "admin" }
};

class UserRepository {
    findById(id) {
        return users[id] || null;
    }

    findAll() {
        return Object.values(users);
    }

    updateScore(id, newScore) {
        if (users[id]) {
            users[id].credibility_score = newScore;
            return users[id];
        }
        return null;
    }
}

// Export a single instance (Singleton pattern)
export const userRepository = new UserRepository();