const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// In-memory mock database of citizens
const users = {
    "user_123": { id: "user_123", name: "Omkar", credibility_score: 100, role: "citizen" },
    "admin_001": { id: "admin_001", name: "City Official", credibility_score: 999, role: "admin" }
};

// Get a user's profile and score
app.get('/api/v1/users/:id', (req, res) => {
    const user = users[req.params.id];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
});

// Endpoint for the Python Agent to adjust scores
app.post('/api/v1/users/:id/adjust-score', (req, res) => {
    const userId = req.params.id;
    const { adjustment, reason } = req.body; // e.g., +10 or -50

    if (!users[userId]) {
        return res.status(404).json({ error: "User not found" });
    }

    users[userId].credibility_score += adjustment;

    console.log(`[Trust Engine] User ${userId} score adjusted by ${adjustment} for: ${reason}. New Score: ${users[userId].credibility_score}`);

    // If score drops below 0, we could theoretically ban them here
    res.json({ success: true, new_score: users[userId].credibility_score });
});

const PORT = 8082;
app.listen(PORT, () => {
    console.log(`User Service (Trust Engine) running on port ${PORT}`);
});
