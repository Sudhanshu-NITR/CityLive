// src/tests/userController.test.js
/**
 * Unit tests for UserController.
 * Express req/res are mocked — no HTTP server needed.
 * UserService is mocked to isolate controller logic.
 */
import { jest } from '@jest/globals';

// ── Mock UserService ──────────────────────────────────────────────────────────
const mockUserService = {
    getAllUsers: jest.fn(),
    getUserById: jest.fn(),
    adjustUserScore: jest.fn(),
};

jest.unstable_mockModule('../services/userService.js', () => ({
    userService: mockUserService,
}));

// ── Mock req/res helpers ──────────────────────────────────────────────────────
function makeRes() {
    const res = {
        _status: 200,
        _body: null,
        status(code) { this._status = code; return this; },
        json(body) { this._body = body; return this; },
    };
    return res;
}

function makeReq({ params = {}, body = {} } = {}) {
    return { params, body };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UserController', () => {
    let userController;

    beforeAll(async () => {
        const mod = await import('../controllers/userController.js');
        userController = mod.userController;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ── getAllUsers ───────────────────────────────────────────────────────────

    describe('getAllUsers', () => {
        test('responds with full user list as JSON', () => {
            const users = [
                { id: 'citizen_001', name: 'Priya Sharma', role: 'citizen' },
                { id: 'admin_001', name: 'Commander Mehta', role: 'admin' },
            ];
            mockUserService.getAllUsers.mockReturnValue(users);

            const req = makeReq();
            const res = makeRes();
            userController.getAllUsers(req, res);

            expect(res._body).toEqual(users);
            expect(mockUserService.getAllUsers).toHaveBeenCalledTimes(1);
        });

        test('returns empty array when no users', () => {
            mockUserService.getAllUsers.mockReturnValue([]);
            const res = makeRes();
            userController.getAllUsers(makeReq(), res);
            expect(res._body).toEqual([]);
        });
    });

    // ── getUser ───────────────────────────────────────────────────────────────

    describe('getUser', () => {
        test('responds 200 with user when found', () => {
            const user = { id: 'citizen_001', name: 'Priya', role: 'citizen' };
            mockUserService.getUserById.mockReturnValue(user);

            const req = makeReq({ params: { id: 'citizen_001' } });
            const res = makeRes();
            userController.getUser(req, res);

            expect(res._status).toBe(200);
            expect(res._body).toEqual(user);
        });

        test('responds 404 when user not found', () => {
            mockUserService.getUserById.mockReturnValue(null);

            const req = makeReq({ params: { id: 'ghost_999' } });
            const res = makeRes();
            userController.getUser(req, res);

            expect(res._status).toBe(404);
            expect(res._body).toHaveProperty('error');
        });

        test('passes correct id to service', () => {
            mockUserService.getUserById.mockReturnValue({ id: 'admin_002' });
            const req = makeReq({ params: { id: 'admin_002' } });
            userController.getUser(req, makeRes());
            expect(mockUserService.getUserById).toHaveBeenCalledWith('admin_002');
        });
    });

    // ── adjustScore ───────────────────────────────────────────────────────────

    describe('adjustScore', () => {
        test('responds with success and new_score when user found', () => {
            mockUserService.adjustUserScore.mockReturnValue({
                id: 'citizen_001', credibility_score: 95,
            });

            const req = makeReq({
                params: { id: 'citizen_001' },
                body: { adjustment: 10, reason: 'Valid report' },
            });
            const res = makeRes();
            userController.adjustScore(req, res);

            expect(res._body.success).toBe(true);
            expect(res._body.new_score).toBe(95);
        });

        test('responds 404 when user not found', () => {
            mockUserService.adjustUserScore.mockReturnValue(null);

            const req = makeReq({
                params: { id: 'ghost' },
                body: { adjustment: -10, reason: 'Spam' },
            });
            const res = makeRes();
            userController.adjustScore(req, res);

            expect(res._status).toBe(404);
        });

        test('passes correct params to service', () => {
            mockUserService.adjustUserScore.mockReturnValue({ credibility_score: 75 });

            const req = makeReq({
                params: { id: 'citizen_002' },
                body: { adjustment: -10, reason: 'Invalid report' },
            });
            userController.adjustScore(req, makeRes());

            expect(mockUserService.adjustUserScore).toHaveBeenCalledWith(
                'citizen_002', -10, 'Invalid report'
            );
        });

        test('handles negative adjustment (penalty)', () => {
            mockUserService.adjustUserScore.mockReturnValue({ credibility_score: 75 });
            const req = makeReq({
                params: { id: 'citizen_001' },
                body: { adjustment: -10, reason: 'Penalty' },
            });
            const res = makeRes();
            userController.adjustScore(req, res);
            expect(res._body.new_score).toBe(75);
        });
    });
});
