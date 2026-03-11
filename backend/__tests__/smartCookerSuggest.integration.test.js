const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.REQUIRE_API_SESSION = 'false';

const app = require('../server');
const AUTH_HEADER = { Authorization: 'Bearer test-access-token' };

describe('POST /api/smart-cooker/suggest', () => {
    test('returns ranked smart cooker suggestions from local Egyptian catalog', async () => {
        const response = await request(app)
            .post('/api/smart-cooker/suggest')
            .set(AUTH_HEADER)
            .send({
                ingredients: ['أرز', 'عدس', 'بصل'],
                limit: 8,
                lang: 'ar',
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
                    protein: expect.any(Number),
                    carbs: expect.any(Number),
                    fats: expect.any(Number),
                    confidence: expect.any(String),
                }),
            }),
        );
    });

    test('returns 400 when ingredient list is missing', async () => {
        const response = await request(app)
            .post('/api/smart-cooker/suggest')
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
