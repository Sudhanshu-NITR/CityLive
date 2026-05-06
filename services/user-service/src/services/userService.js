// src/services/userService.js
import { userRepository } from '../models/userRepository.js';

class UserService {
    getUserById(id) {
        return userRepository.findById(id);
    }

    adjustUserScore(id, adjustment, reason) {
        const user = userRepository.findById(id);
        if (!user) {
            return null; // User not found
        }

        // Business Logic: Calculate new score
        const newScore = user.credibility_score + adjustment;

        // Update data via Repository
        const updatedUser = userRepository.updateScore(id, newScore);

        console.log(`[Trust Engine] User ${id} score adjusted by ${adjustment} for: ${reason}. New Score: ${updatedUser.credibility_score}`);

        // If score drops below 0, we could trigger a ban event here

        return updatedUser;
    }
}

export const userService = new UserService();
