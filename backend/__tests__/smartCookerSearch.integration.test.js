const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.REQUIRE_API_SESSION = 'false';

const app = require('../server');
const AUTH_HEADER = { Authorization: 'Bearer test-access-token' };

describe('POST /api/smart-cooker/search', () => {
    test('returns smart cooker matches based on provided ingredients', async () => {
        const response = await request(app)
            .post('/api/smart-cooker/search')
            .set(AUTH_HEADER)
            .send({
                ingredients: ['طماطم', 'بصل', 'رز'],
                limit: 6,
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                session_id: expect.any(String),
                suggestions: expect.any(Array),
                meta: expect.objectContaining({
                    total_candidates: expect.any(Number),
                    total_suggestions: expect.any(Number),
                }),
            }),
        );

        expect(response.body.suggestions.length).toBeGreaterThan(0);
        expect(response.body.suggestions[0]).toEqual(
            expect.objectContaining({
                cookpad_id: expect.any(String),
                recipe_id: expect.any(String),
                title_ar: expect.any(String),
                ingredient_coverage: expect.any(Number),
                estimated_nutrition: expect.objectContaining({
                    calories: expect.any(Number),
                }),
            }),
        );
    });

    test('returns 400 when ingredients are empty', async () => {
        const response = await request(app)
            .post('/api/smart-cooker/search')
            .set(AUTH_HEADER)
            .send({ ingredients: [] });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(
            expect.objectContaining({
                code: 'INVALID_PAYLOAD',
            }),
        );
    });
});
