const { Readable } = require('node:stream');
const axios = require('axios');

jest.mock('axios');
jest.mock('@dimfu/recipe-scraper', () => jest.fn());

const schemaScraper = require('@dimfu/recipe-scraper');
const { parseRecipeFromUrl } = require('../services/recipeParserService');

const MB = 1024 * 1024;

function streamFromString(value) {
    return Readable.from([Buffer.from(value)]);
}

function recipeHtml(title = 'Tomato Soup') {
    return `
        <html lang="en">
            <head>
                <title>${title}</title>
            </head>
            <body>
                <h1>${title}</h1>
                <ul class="ingredients">
                    <li>1 cup water</li>
                    <li>2 tomatoes</li>
                </ul>
                <ol class="instructions">
                    <li>Blend all ingredients.</li>
                    <li>Cook for 10 minutes.</li>
                </ol>
            </body>
        </html>
    `;
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('parseRecipeFromUrl', () => {
    test('passes pre-fetched HTML into schema scraper without URL-only fallback', async () => {
        schemaScraper.mockResolvedValueOnce(null);

        axios.get.mockResolvedValueOnce({
            status: 200,
            headers: {
                'content-type': 'text/html; charset=utf-8',
                'content-length': '256',
            },
            data: streamFromString(recipeHtml('Schema Scraper Invocation')),
        });

        await parseRecipeFromUrl('https://www.example.com/recipe');

        expect(schemaScraper).toHaveBeenCalledTimes(1);
        expect(schemaScraper).toHaveBeenCalledWith(
            expect.objectContaining({
                html: expect.any(String),
                maxRedirects: 0,
            }),
        );
        expect(schemaScraper.mock.calls[0]).toHaveLength(1);
    });

    test('uses pinned DNS address while keeping original Host header', async () => {
        axios.get.mockResolvedValueOnce({
            status: 200,
            headers: {
                'content-type': 'text/html; charset=utf-8',
                'content-length': '256',
            },
            data: streamFromString(recipeHtml('Pinned Host Recipe')),
        });

        const parsed = await parseRecipeFromUrl('https://www.example.com/recipe', {
            resolvedAddress: '93.184.216.34',
        });

        expect(parsed.title).toBe('Pinned Host Recipe');
        expect(parsed.ingredients.length).toBeGreaterThan(0);
        expect(axios.get).toHaveBeenCalledTimes(1);

        const [, config] = axios.get.mock.calls[0];
        expect(config.maxRedirects).toBe(0);
        expect(config.headers.Host).toBe('www.example.com');
        expect(config.headers.Accept).toContain('text/html');
        expect(config.httpAgent).toBeDefined();
        expect(config.httpsAgent).toBeDefined();
        expect(typeof config.httpAgent.options.lookup).toBe('function');
        expect(typeof config.httpsAgent.options.lookup).toBe('function');
    });

    test('rejects non-HTML responses', async () => {
        axios.get.mockResolvedValueOnce({
            status: 200,
            headers: {
                'content-type': 'application/pdf',
                'content-length': '128',
            },
            data: streamFromString('%PDF-1.7'),
        });

        await expect(parseRecipeFromUrl('https://example.com/recipe')).rejects.toMatchObject({
            code: 'PARSE',
        });
    });

    test('rejects responses larger than 5MB', async () => {
        axios.get.mockResolvedValueOnce({
            status: 200,
            headers: {
                'content-type': 'text/html',
                'content-length': String(5 * MB + 1),
            },
            data: streamFromString(recipeHtml('Large Recipe')),
        });

        await expect(parseRecipeFromUrl('https://example.com/recipe')).rejects.toMatchObject({
            code: 'PARSE',
        });
    });

    test('re-checks redirect target via supplied resolver before following', async () => {
        const resolveAddress = jest.fn().mockResolvedValueOnce('151.101.1.67');

        axios.get
            .mockResolvedValueOnce({
                status: 302,
                headers: {
                    location: 'https://redirected.example/recipe',
                },
                data: Readable.from([]),
            })
            .mockResolvedValueOnce({
                status: 200,
                headers: {
                    'content-type': 'text/html; charset=utf-8',
                    'content-length': '256',
                },
                data: streamFromString(recipeHtml('Redirected Recipe')),
            });

        const parsed = await parseRecipeFromUrl('https://example.com/recipe', {
            resolvedAddress: '93.184.216.34',
            resolveAddress,
        });

        expect(parsed.title).toBe('Redirected Recipe');
        expect(resolveAddress).toHaveBeenCalledTimes(1);
        expect(resolveAddress).toHaveBeenCalledWith(expect.any(URL));
        expect(resolveAddress.mock.calls[0][0].toString()).toBe('https://redirected.example/recipe');
        expect(axios.get).toHaveBeenCalledTimes(2);

        const [, firstConfig] = axios.get.mock.calls[0];
        expect(firstConfig.headers.Host).toBe('example.com');

        const [, secondConfig] = axios.get.mock.calls[1];
        expect(secondConfig.headers.Host).toBe('redirected.example');
    });

    test('propagates SSRF_BLOCKED from resolver checks', async () => {
        const blockedError = new Error('Blocked private network target');
        blockedError.code = 'SSRF_BLOCKED';
        const resolveAddress = jest.fn().mockRejectedValueOnce(blockedError);

        await expect(
            parseRecipeFromUrl('https://example.com/recipe', {
                resolveAddress,
            }),
        ).rejects.toMatchObject({
            code: 'SSRF_BLOCKED',
        });

        expect(axios.get).not.toHaveBeenCalled();
    });
});
