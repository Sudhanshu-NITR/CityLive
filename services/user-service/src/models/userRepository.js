// src/models/userRepository.js

// In-memory mock database
const users = {
    "user_123": { id: "user_123", name: "Omkar", credibility_score: 100, role: "citizen" },
    "admin_001": { id: "admin_001", name: "City Official", credibility_score: 999, role: "admin" }
};

class UserRepository {
    findById(id) {
        return users[id] || null;
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