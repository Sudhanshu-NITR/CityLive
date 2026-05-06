// src/controllers/userController.js
import { userService } from "../services/userService.js"

class UserController {
    // The contoller just parses the request and determines the HTTP status code

    getUser(req, res) {
        const user = userService.getUserById(req.params.id);

        if (!user) {
            return res.status(404).json({ "error": "User not found" });
        }

        res.json(user);
    }

    adjustScore(req, res) {
        const userId = req.params.id;
        const { adjustment, reason } = req.body;

        const updatedUser = userService.adjustUserScore(userId, adjustment, reason);

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ success: true, new_score: updatedUser.credibility_score });
    }
}

export const userController = new UserController();