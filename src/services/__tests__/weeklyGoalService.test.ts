import {
    createWeeklyPlan,
    getActivePlan,
} from '../api/weeklyGoals';
import { database } from '../../database';

// Mock dependencies
jest.mock('../../database', () => ({
    database: {
        write: jest.fn((callback) => callback()),
        get: jest.fn(),
    },
}));

jest.mock('../../utils/errors', () => ({
    handleError: jest.fn(),
}));

describe('weeklyGoalService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createWeeklyPlan', () => {
        it('should create a plan with correct data', async () => {
            const mockUser = { id: 'user1' };
            const mockPlanCollection = {
                create: jest.fn((cb) => {
                    const mockObj = {};
                    cb(mockObj);
                    return mockObj;
                }),
            };
            const mockUserCollection = {
                query: jest.fn(() => ({
                    fetch: jest.fn().mockResolvedValue([mockUser]),
                })),
            };

            (database.get as jest.Mock).mockImplementation((table) => {
                if (table === 'users') return mockUserCollection;
                if (table === 'weekly_goal_plans') return mockPlanCollection;
                return {};
            });

            const planData = {
                planName: 'Test Plan',
                mondayCalories: 2000,
                mondayProtein: 150,
                mondayCarbs: 200,
                mondayFats: 60,
                // ... other days would be passed here
            } as any;

            await createWeeklyPlan(planData);

            expect(mockPlanCollection.create).toHaveBeenCalled();
        });
    });

    describe('getActivePlan', () => {
        it('should return null if no active plan exists', async () => {
            const mockFetch = jest.fn().mockResolvedValue([]);
            const mockQuery = jest.fn(() => ({ fetch: mockFetch }));
            const mockCollection = { query: mockQuery };

            (database.get as jest.Mock).mockReturnValue(mockCollection);

            const result = await getActivePlan();

            expect(result).toBeNull();
        });

        it('should return the first active plan if found', async () => {
            const mockPlan = { id: 'plan1', isActive: true };
            const mockFetch = jest.fn().mockResolvedValue([mockPlan]);
            const mockQuery = jest.fn(() => ({ fetch: mockFetch }));
            const mockCollection = { query: mockQuery };

            (database.get as jest.Mock).mockReturnValue(mockCollection);

            const result = await getActivePlan();

            expect(result).toEqual(mockPlan);
        });
    });
});
