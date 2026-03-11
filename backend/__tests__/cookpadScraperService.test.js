const nock = require('nock');
const {
    __clearCookpadCacheForTests,
    extractRecipeIdsFromSearchHtml,
    fetchRecipeById,
    searchRecipesByIngredient,
} = require('../services/cookpadScraperService');

const buildRecipeHtml = (title = 'Koshary') => `
    <html lang="en">
        <head>
            <meta property="og:title" content="${title}" />
            <meta property="og:image" content="https://images.example/${title}.jpg" />
            <script type="application/ld+json">
                {
                    "@context": "https://schema.org",
                    "@type": "Recipe",
                    "name": "${title}",
                    "recipeYield": "4 servings",
                    "recipeIngredient": ["2 cups rice", "1 cup lentils"],
                    "recipeInstructions": [
                        { "@type": "HowToStep", "text": "Cook rice." },
                        { "@type": "HowToStep", "text": "Mix all ingredients." }
                    ],
                    "prepTime": "PT15M",
                    "cookTime": "PT30M",
                    "totalTime": "PT45M",
                    "keywords": "egyptian,street food",
                    "author": { "@type": "Person", "name": "Chef Mira" },
                    "image": "https://images.example/${title}.jpg"
                }
            </script>
        </head>
        <body>
            <h1>${title}</h1>
            <a href="/eg/recipes/tags/easy">Easy</a>
        </body>
    </html>
`;

beforeAll(() => {
    nock.disableNetConnect();
});

afterAll(() => {
    nock.enableNetConnect();
});

beforeEach(() => {
    __clearCookpadCacheForTests();
    nock.cleanAll();
});

afterEach(() => {
    nock.cleanAll();
});

describe('cookpadScraperService.fetchRecipeById', () => {
    test('parses recipe via JSON-LD and returns cache payload shape', async () => {
        nock('https://cookpad.com').get('/robots.txt').reply(200, 'User-agent: *\nDisallow:\n');
        nock('https://cookpad.com').get('/eg/recipes/12345').reply(200, buildRecipeHtml('Classic Koshary'));

        const recipe = await fetchRecipeById('12345');

        expect(recipe).toEqual(
            expect.objectContaining({
                cookpad_id: '12345',
                source_url: 'https://cookpad.com/eg/recipes/12345',
                title: 'Classic Koshary',
                author: 'Chef Mira',
                servings: 4,
                prep_time: 15,
                cook_time: 30,
                total_time: 45,
            }),
        );
        expect(recipe.ingredients).toEqual(expect.arrayContaining(['2 cups rice', '1 cup lentils']));
        expect(recipe.instructions).toEqual(expect.arrayContaining(['Cook rice.', 'Mix all ingredients.']));
        expect(recipe.tags).toEqual(expect.arrayContaining(['egyptian', 'street food', 'Easy']));
        expect(recipe.fetched_at).toEqual(expect.any(Number));
        expect(recipe.expires_at).toEqual(expect.any(Number));
    });

    test('uses in-memory cache for repeated recipe calls', async () => {
        nock('https://cookpad.com').get('/robots.txt').reply(200, 'User-agent: *\nDisallow:\n');
        nock('https://cookpad.com').get('/eg/recipes/cache-hit').once().reply(200, buildRecipeHtml('Cache Hit Recipe'));

        const first = await fetchRecipeById('cache-hit');
        const second = await fetchRecipeById('cache-hit');

        expect(second).toBe(first);
        expect(nock.pendingMocks()).toHaveLength(0);
    });

    test('throws NOT_FOUND when upstream recipe does not exist', async () => {
        nock('https://cookpad.com').get('/robots.txt').reply(200, 'User-agent: *\nDisallow:\n');
        nock('https://cookpad.com')
            .get('/eg/recipes/missing-id')
            .reply(404)
            .get('/eg/%D9%88%D8%B5%D9%81%D8%A7%D8%AA/missing-id')
            .reply(404);

        await expect(fetchRecipeById('missing-id')).rejects.toMatchObject({
            code: 'NOT_FOUND',
            status: 404,
        });
    });

    test('respects robots disallow rules', async () => {
        nock('https://cookpad.com').get('/robots.txt').reply(200, 'User-agent: *\nDisallow: /eg/recipes/\n');

        await expect(fetchRecipeById('blocked-by-robots')).rejects.toMatchObject({
            code: 'ROBOTS_BLOCKED',
            status: 403,
        });
    });
});

describe('cookpadScraperService.searchRecipesByIngredient', () => {
    test('extracts recipe ids from Cookpad search page', async () => {
        const searchHtml = `
            <html>
                <body>
                    <a href="/eg/recipes/12345-delicious-koshari">Recipe A</a>
                    <a href="/eg/recipes/abc_987-homemade-salad">Recipe B</a>
                    <a href="/eg/recipes/12345-delicious-koshari">Recipe A Duplicate</a>
                </body>
            </html>
        `;

        nock('https://cookpad.com').get('/robots.txt').reply(200, 'User-agent: *\nDisallow:\n');
        nock('https://cookpad.com').get('/eg/search/%D8%B7%D9%85%D8%A7%D8%B7%D9%85').reply(200, searchHtml);

        const result = await searchRecipesByIngredient('طماطم');
        expect(result).toEqual(['12345-delicious-koshari', 'abc_987-homemade-salad']);
    });

    test('parses recipe ids from raw HTML utility function', () => {
        const html = `
            <div>
                <a href="/eg/recipes/2222-foul">Foul</a>
                <a href="/eg/recipes/3333-molokhia">Molokhia</a>
                <div data-recipe-id="4444"></div>
            </div>
        `;

        const ids = extractRecipeIdsFromSearchHtml(html);
        expect(ids).toEqual(['2222-foul', '3333-molokhia', '4444']);
    });
});
