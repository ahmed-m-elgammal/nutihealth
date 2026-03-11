const request = require('supertest');
const axios = require('axios');

const mockSupabaseGetUser = jest.fn();
const mockSupabaseDeleteUser = jest.fn();
const mockHfImageClassification = jest.fn();

jest.mock('axios');
jest.mock('@huggingface/inference', () => ({
    HfInference: jest.fn(() => ({
        imageClassification: mockHfImageClassification,
    })),
}));
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        auth: {
            getUser: mockSupabaseGetUser,
            admin: {
                deleteUser: mockSupabaseDeleteUser,
            },
        },
    })),
}));
jest.mock('node:dns', () => ({
    promises: {
        lookup: jest.fn(),
    },
}));
jest.mock('../services/recipeParserService', () => ({
    parseRecipeFromUrl: jest.fn(),
}));
jest.mock('../services/cookpadScraperService', () => ({
    fetchRecipeById: jest.fn(),
    searchRecipesByIngredient: jest.fn(),
}));

const { promises: dnsPromises } = require('node:dns');
const { parseRecipeFromUrl } = require('../services/recipeParserService');

process.env.NODE_ENV = 'test';
process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
process.env.OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';
process.env.OPENROUTER_CHAT_MODEL = 'meta-llama/llama-3.3-70b-instruct';
process.env.OPENROUTER_VISION_MODEL = 'openai/gpt-4o-mini';
process.env.HF_API_TOKEN = 'test-hf-token';
process.env.OPENWEATHER_API_KEY = 'test-openweather-key';
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

const app = require('../server');
const AUTH_HEADER = { Authorization: 'Bearer test-access-token' };

beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseGetUser.mockResolvedValue({
        data: {
            user: {
                id: 'user-123',
            },
        },
        error: null,
    });
    mockSupabaseDeleteUser.mockResolvedValue({
        data: {
            user: null,
        },
        error: null,
    });
    mockHfImageClassification.mockReset();
});

describe('GET /api/healthz', () => {
    test('returns service health data', async () => {
        const response = await request(app).get('/api/healthz');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                status: 'ok',
                service: 'nutrihealth-backend',
            }),
        );
        expect(response.body.timestamp).toEqual(expect.any(String));
    });

    test('returns CORS error for a blocked origin', async () => {
        const response = await request(app).get('/api/healthz').set('Origin', 'https://blocked-origin.example');

        expect(response.status).toBe(403);
        expect(response.body).toEqual(
            expect.objectContaining({
                code: 'CORS_BLOCKED',
            }),
        );
    });
});

describe('GET /metrics', () => {
    test('returns Prometheus metrics payload', async () => {
        const response = await request(app).get('/metrics');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/plain');
        expect(response.text).toContain('nutrihealth_http_requests_total');
        expect(response.text).toContain('nutrihealth_http_request_duration_ms');
        expect(response.text).toContain('nutrihealth_http_request_errors_total');
    });

    test('blocks non-internal metrics requests in production', async () => {
        const previousNodeEnv = process.env.NODE_ENV;
        const previousRequireApiSession = process.env.REQUIRE_API_SESSION;

        process.env.NODE_ENV = 'production';
        process.env.REQUIRE_API_SESSION = 'true';

        jest.resetModules();
        const productionApp = require('../server');

        const response = await request(productionApp).get('/metrics').set('X-Forwarded-For', '8.8.8.8');

        expect(response.status).toBe(403);
        expect(response.body).toEqual(
            expect.objectContaining({
                code: 'FORBIDDEN',
            }),
        );

        process.env.NODE_ENV = previousNodeEnv;
        process.env.REQUIRE_API_SESSION = previousRequireApiSession;
        jest.resetModules();
    });

    test('allows internal metrics requests in production', async () => {
        const previousNodeEnv = process.env.NODE_ENV;
        const previousRequireApiSession = process.env.REQUIRE_API_SESSION;

        process.env.NODE_ENV = 'production';
        process.env.REQUIRE_API_SESSION = 'true';

        jest.resetModules();
        const productionApp = require('../server');

        const response = await request(productionApp).get('/metrics').set('X-Forwarded-For', '10.0.0.15');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/plain');

        process.env.NODE_ENV = previousNodeEnv;
        process.env.REQUIRE_API_SESSION = previousRequireApiSession;
        jest.resetModules();
    });
});

describe('POST /api/chat', () => {
    test('returns chat completion for a valid messages payload', async () => {
        const upstreamPayload = {
            id: 'chatcmpl-test',
            choices: [{ message: { role: 'assistant', content: '{"ok":true}' } }],
        };
        axios.post.mockResolvedValueOnce({ data: upstreamPayload });

        const response = await request(app)
            .post('/api/chat')
            .set(AUTH_HEADER)
            .send({ messages: [{ role: 'user', content: 'Analyze this meal' }] });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(upstreamPayload);
        expect(axios.post).toHaveBeenCalledWith(
            'https://openrouter.ai/api/v1/chat/completions',
            expect.objectContaining({
                model: 'meta-llama/llama-3.3-70b-instruct',
            }),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-openrouter-key',
                }),
            }),
        );
    });

    test('rejects an invalid chat payload', async () => {
        const response = await request(app).post('/api/chat').set(AUTH_HEADER).send({ messages: [] });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(
            expect.objectContaining({
                code: 'INVALID_CHAT_PAYLOAD',
            }),
        );
    });
});

describe('POST /api/analyze-food', () => {
    test('returns predictions for a valid image payload', async () => {
        const predictions = [{ label: 'pizza', score: 0.99 }];
        mockHfImageClassification.mockResolvedValueOnce(predictions);

        const response = await request(app)
            .post('/api/analyze-food')
            .set(AUTH_HEADER)
            .send({ image: 'data:image/jpeg;base64,ZmFrZV9pbWFnZQ==' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(predictions);
        expect(mockHfImageClassification).toHaveBeenCalledWith(
            expect.objectContaining({
                model: 'google/vit-base-patch16-224-in21k-finetuned-food101',
                data: expect.any(Buffer),
            }),
        );
    });

    test('rejects an invalid image payload', async () => {
        const response = await request(app)
            .post('/api/analyze-food')
            .set(AUTH_HEADER)
            .send({ image: 'not-a-data-url' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(
            expect.objectContaining({
                code: 'INVALID_IMAGE_PAYLOAD',
            }),
        );
    });

    test('falls back to OpenRouter vision when HF token is missing', async () => {
        const previousHfToken = process.env.HF_API_TOKEN;
        delete process.env.HF_API_TOKEN;
        axios.post.mockResolvedValueOnce({
            data: {
                choices: [
                    {
                        message: {
                            content: '```json\n[{"label":"pizza","score":0.91},{"label":"tomato","score":0.72}]\n```',
                        },
                    },
                ],
            },
        });

        const response = await request(app)
            .post('/api/analyze-food')
            .set(AUTH_HEADER)
            .send({ image: 'data:image/jpeg;base64,ZmFrZV9pbWFnZQ==' });

        process.env.HF_API_TOKEN = previousHfToken;

        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            { label: 'pizza', score: 0.91 },
            { label: 'tomato', score: 0.72 },
        ]);
        expect(axios.post).toHaveBeenCalledWith(
            'https://openrouter.ai/api/v1/chat/completions',
            expect.objectContaining({
                model: 'openai/gpt-4o-mini',
            }),
            expect.any(Object),
        );
    });

    test('falls back to OpenRouter vision when HF auth fails', async () => {
        mockHfImageClassification.mockRejectedValueOnce({
            message: 'Invalid username or password.',
            httpResponse: {
                status: 401,
                body: {
                    error: 'Invalid username or password.',
                },
            },
        });
        axios.post.mockResolvedValueOnce({
            data: {
                choices: [
                    {
                        message: {
                            content: '[{"label":"burger","score":0.83}]',
                        },
                    },
                ],
            },
        });

        const response = await request(app)
            .post('/api/analyze-food')
            .set(AUTH_HEADER)
            .send({ image: 'data:image/jpeg;base64,ZmFrZV9pbWFnZQ==' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual([{ label: 'burger', score: 0.83 }]);
        expect(axios.post).toHaveBeenCalledWith(
            'https://openrouter.ai/api/v1/chat/completions',
            expect.objectContaining({
                model: 'openai/gpt-4o-mini',
            }),
            expect.any(Object),
        );
    });
});

describe('GET /api/weather', () => {
    test('returns weather data for a valid city query', async () => {
        const weather = { name: 'Boston', main: { temp: 19.2 } };
        axios.get.mockResolvedValueOnce({ data: weather });

        const response = await request(app).get('/api/weather?city=Boston').set(AUTH_HEADER);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(weather);
        expect(axios.get).toHaveBeenCalledWith(
            'https://api.openweathermap.org/data/2.5/weather',
            expect.objectContaining({
                params: expect.objectContaining({
                    q: 'Boston',
                    appid: 'test-openweather-key',
                }),
            }),
        );
    });

    test('rejects weather requests with missing location parameters', async () => {
        const response = await request(app).get('/api/weather').set(AUTH_HEADER);

        expect(response.status).toBe(400);
        expect(response.body).toEqual(
            expect.objectContaining({
                code: 'INVALID_LOCATION',
            }),
        );
    });
});

describe('DELETE /api/account', () => {
    test('requires an authenticated user bearer token', async () => {
        const response = await request(app).delete('/api/account');

        expect(response.status).toBe(401);
        expect(response.body).toEqual(
            expect.objectContaining({
                code: 'UNAUTHORIZED_USER',
            }),
        );
    });

    test('deletes the authenticated user account through Supabase admin API', async () => {
        const response = await request(app).delete('/api/account').set('Authorization', 'Bearer test-access-token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                success: true,
                deletedUserId: 'user-123',
            }),
        );
        expect(mockSupabaseGetUser).toHaveBeenCalledWith('test-access-token');
        expect(mockSupabaseDeleteUser).toHaveBeenCalledWith('user-123', false);
    });

    test('rejects account deletion for invalid or expired bearer tokens', async () => {
        mockSupabaseGetUser.mockResolvedValueOnce({
            data: {
                user: null,
            },
            error: {
                message: 'JWT expired',
            },
        });

        const response = await request(app).delete('/api/account').set('Authorization', 'Bearer expired-token');

        expect(response.status).toBe(401);
        expect(response.body).toEqual(
            expect.objectContaining({
                code: 'UNAUTHORIZED_USER',
            }),
        );
        expect(mockSupabaseDeleteUser).not.toHaveBeenCalled();
    });
});

describe('POST /api/recipes/import', () => {
    test('imports a recipe for a valid public URL', async () => {
        const recipe = {
            title: 'Test Recipe',
            ingredients: ['1 cup oats'],
            steps: ['Mix', 'Cook'],
        };
        dnsPromises.lookup.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]);
        parseRecipeFromUrl.mockResolvedValueOnce(recipe);

        const response = await request(app)
            .post('/api/recipes/import')
            .set(AUTH_HEADER)
            .send({ url: 'https://example.com/recipe' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(recipe);
        expect(parseRecipeFromUrl).toHaveBeenCalledWith(
            'https://example.com/recipe',
            expect.objectContaining({
                resolvedAddress: '93.184.216.34',
                resolveAddress: expect.any(Function),
            }),
        );
    });

    test('rejects an invalid recipe URL payload', async () => {
        const response = await request(app).post('/api/recipes/import').set(AUTH_HEADER).send({ url: '' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(
            expect.objectContaining({
                code: 'INVALID_URL',
            }),
        );
    });
});

describe('GET /api/smart-cooker/recipe/:id', () => {
    test('returns local Egyptian catalog recipe data for a valid recipe id', async () => {
        const response = await request(app).get('/api/smart-cooker/recipe/1').set(AUTH_HEADER);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                recipe_id: '1',
                cookpad_id: '1',
                title_ar: expect.any(String),
                ingredients_ar: expect.any(Array),
                nutrition: expect.objectContaining({
                    calories: expect.any(Number),
                    protein: expect.any(Number),
                    carbs: expect.any(Number),
                    fats: expect.any(Number),
                }),
            }),
        );
    });

    test('returns 404 when recipe is not found', async () => {
        const response = await request(app).get('/api/smart-cooker/recipe/missing-recipe').set(AUTH_HEADER);

        expect(response.status).toBe(404);
        expect(response.body).toEqual(
            expect.objectContaining({
                code: 'NOT_FOUND',
            }),
        );
    });
});

describe('Smart Cooker replacement endpoints', () => {
    test('GET /api/smart-cooker/catalog returns local catalog matches', async () => {
        const response = await request(app).get('/api/smart-cooker/catalog?query=كشري&lang=ar&limit=5').set(AUTH_HEADER);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                query: 'كشري',
                lang: 'ar',
                total: expect.any(Number),
                items: expect.any(Array),
            }),
        );
    });

    test('GET /api/smart-cooker/catalog includes recipes loaded from food.csv', async () => {
        const response = await request(app).get('/api/smart-cooker/catalog?query=لوبستر&lang=ar&limit=10').set(AUTH_HEADER);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                query: 'لوبستر',
                items: expect.any(Array),
            }),
        );
        expect(response.body.items.length).toBeGreaterThan(0);
        expect(response.body.items.some((item) => String(item.display_name || '').includes('لوبستر'))).toBe(true);
        expect(response.body.items.some((item) => typeof item.category === 'string' && item.category.length > 0)).toBe(
            true,
        );
    });

    test('POST /api/smart-cooker/estimate returns nutrition estimate', async () => {
        const response = await request(app)
            .post('/api/smart-cooker/estimate')
            .set(AUTH_HEADER)
            .send({
                recipe_id: '1',
                ingredients_quantities: [
                    { name: 'أرز', quantity: 200, unit: 'g' },
                    { name: 'عدس', quantity: 120, unit: 'g' },
                    { name: 'بصل', quantity: 60, unit: 'g' },
                ],
                serving_size_g: 450,
                cooking_state: 'after',
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                recipe: expect.objectContaining({
                    recipe_id: '1',
                }),
                estimated_nutrition: expect.objectContaining({
                    calories: expect.any(Number),
                    protein: expect.any(Number),
                    carbs: expect.any(Number),
                    fats: expect.any(Number),
                }),
                per_100g: expect.objectContaining({
                    calories: expect.any(Number),
                }),
            }),
        );
    });
});
