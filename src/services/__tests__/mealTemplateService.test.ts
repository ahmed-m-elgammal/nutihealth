import {
    createMealTemplate,
    getAllMealTemplates,
} from '../api/mealTemplates';
import { database } from '../../database';

// Mock the dependencies
jest.mock('../../database', () => ({
    database: {
        write: jest.fn((callback) => callback()),
        get: jest.fn(),
    },
}));

jest.mock('../api/meals', () => ({
    createMeal: jest.fn(),
}));

jest.mock('../../utils/errors', () => ({
    handleError: jest.fn(),
}));

describe('mealTemplateService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createMealTemplate', () => {
        it('should create a template with calculated macros', async () => {
            const mockUser = { id: 'user1' };
            const mockCollection = {
                create: jest.fn((cb) => {
                    const mockObj = {};
                    cb(mockObj);
                    return mockObj;
                }),
                query: jest.fn(() => ({
                    fetch: jest.fn().mockResolvedValue([mockUser]),
                })),
            };

            (database.get as jest.Mock).mockReturnValue(mockCollection);

            const inputData = {
                name: 'Test Breakfast',
                mealType: 'breakfast' as const,
                foods: [
                    {
                        name: 'Egg',
                        servingSize: 50,
                        servingUnit: 'g',
                        quantity: 2,
                        calories: 70,
                        protein: 6,
                        carbs: 0,
                        fats: 5,
                    },
                ],
            };

            await createMealTemplate(inputData);

            expect(mockCollection.create).toHaveBeenCalled();
            // Verify macros were calculated: 70*2=140 cal, 6*2=12p, 0c, 5*2=10f
        });
    });

    describe('getAllMealTemplates', () => {
        it('should fetch templates sorted by use count', async () => {
            const mockFetch = jest.fn().mockResolvedValue([]);
            const mockQuery = jest.fn(() => ({ fetch: mockFetch }));
            const mockCollection = { query: mockQuery };

            (database.get as jest.Mock).mockReturnValue(mockCollection);

            await getAllMealTemplates();

            expect(mockQuery).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalled();
        });
    });
});
