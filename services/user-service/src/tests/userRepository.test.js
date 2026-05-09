// src/tests/userRepository.test.js
/**
 * Unit tests for UserRepository (in-memory mock database).
 * No mocking needed — tests the pure data logic directly.
 */
import { userRepository } from '../models/userRepository.js';

describe('UserRepository', () => {

    // Reset scores between tests to avoid state bleed
    afterEach(() => {
        userRepository.updateScore('citizen_001', 85);
        userRepository.updateScore('citizen_002', 92);
    });

    // ── findById ─────────────────────────────────────────────────────────────

    describe('findById', () => {
        test('returns correct citizen user', () => {
            const user = userRepository.findById('citizen_001');
            expect(user).not.toBeNull();
            expect(user.id).toBe('citizen_001');
            expect(user.role).toBe('citizen');
            expect(user.name).toBe('Priya Sharma');
        });

        test('returns correct admin user', () => {
            const user = userRepository.findById('admin_001');
            expect(user).not.toBeNull();
            expect(user.role).toBe('admin');
            expect(user.credibility_score).toBe(999);
        });

        test('returns null for unknown user id', () => {
            const user = userRepository.findById('ghost_999');
            expect(user).toBeNull();
        });

        test('returns null for empty string id', () => {
            const user = userRepository.findById('');
            expect(user).toBeNull();
        });
    });

    // ── findAll ───────────────────────────────────────────────────────────────

    describe('findAll', () => {
        test('returns all users as an array', () => {
            const users = userRepository.findAll();
            expect(Array.isArray(users)).toBe(true);
            expect(users.length).toBeGreaterThanOrEqual(8); // 5 citizens + 3 admins
        });

        test('includes both citizens and admins', () => {
            const users = userRepository.findAll();
            const roles = users.map(u => u.role);
            expect(roles).toContain('citizen');
            expect(roles).toContain('admin');
        });

        test('each user has required fields', () => {
            const users = userRepository.findAll();
            users.forEach(user => {
                expect(user).toHaveProperty('id');
                expect(user).toHaveProperty('name');
                expect(user).toHaveProperty('credibility_score');
                expect(user).toHaveProperty('role');
            });
        });
    });

    // ── updateScore ───────────────────────────────────────────────────────────

    describe('updateScore', () => {
        test('persists new score correctly', () => {
            userRepository.updateScore('citizen_001', 95);
            const user = userRepository.findById('citizen_001');
            expect(user.credibility_score).toBe(95);
        });

        test('returns updated user object', () => {
            const result = userRepository.updateScore('citizen_001', 75);
            expect(result).not.toBeNull();
            expect(result.credibility_score).toBe(75);
        });

        test('returns null for unknown user', () => {
            const result = userRepository.updateScore('ghost_999', 50);
            expect(result).toBeNull();
        });

        test('score can be set to zero', () => {
            userRepository.updateScore('citizen_004', 0);
            const user = userRepository.findById('citizen_004');
            expect(user.credibility_score).toBe(0);
        });

        test('score can be negative (banned state)', () => {
            userRepository.updateScore('citizen_001', -20);
            const user = userRepository.findById('citizen_001');
            expect(user.credibility_score).toBe(-20);
        });
    });
});
