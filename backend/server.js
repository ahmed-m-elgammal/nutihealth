const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const promClient = require('prom-client');
const { createClient } = require('@supabase/supabase-js');
const { Buffer } = require('node:buffer');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const recipeImportRoutes = require('./routes/recipeImport');
const smartCookerRoutes = require('./routes/smartCooker');
const { logger, httpLogger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_TEST_ENV = NODE_ENV === 'test';
const CORS_ALLOW_LOCALHOST_FALLBACK = process.env.CORS_ALLOW_LOCALHOST_FALLBACK === 'true';

const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 100;
const DEFAULT_AI_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_AI_RATE_LIMIT_MAX = 20;
const DEFAULT_RECIPE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RECIPE_RATE_LIMIT_MAX = 30;
const DEFAULT_COOKPAD_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_COOKPAD_RATE_LIMIT_MAX = 20;
const DEFAULT_WEATHER_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_WEATHER_RATE_LIMIT_MAX = 60;
const REQUEST_JSON_LIMIT = process.env.REQUEST_JSON_LIMIT || '6mb';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REQUIRE_API_SESSION = process.env.REQUIRE_API_SESSION !== 'false';

if (NODE_ENV === 'production' && !REQUIRE_API_SESSION) {
    logger.fatal(
        {
            route: 'startup',
            errorMessage: 'REQUIRE_API_SESSION cannot be disabled in production.',
        },
        'Backend configuration error',
    );
    throw new Error('REQUIRE_API_SESSION cannot be disabled in production.');
}

if (REQUIRE_API_SESSION && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
    logger.fatal(
        {
            route: 'startup',
            errorMessage: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when session auth is enabled.',
        },
        'Backend configuration error',
    );
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when session auth is enabled.');
}

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CHAT_COMPLETIONS_URL = String(
    process.env.OPENROUTER_CHAT_COMPLETIONS_URL || process.env.AI_CHAT_COMPLETIONS_URL || DEFAULT_CHAT_COMPLETIONS_URL,
).trim();
const CHAT_MODEL = String(
    process.env.OPENROUTER_CHAT_MODEL ||
        process.env.OPENROUTER_MODEL ||
        process.env.GROQ_CHAT_MODEL ||
        'openai/gpt-4o-mini',
).trim();
const CHAT_API_KEY = String(process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || '').trim();
const AI_CHAT_TIMEOUT_MS = parsePositiveInt(process.env.AI_CHAT_TIMEOUT_MS, 30000);
const OPENROUTER_SITE_URL = String(process.env.OPENROUTER_SITE_URL || '').trim();
const OPENROUTER_APP_NAME = String(process.env.OPENROUTER_APP_NAME || 'NutriHealth Backend').trim();
const HF_FOOD_MODEL = String(process.env.HF_FOOD_MODEL || 'google/vit-base-patch16-224-in21k-finetuned-food101').trim();
const HF_FOOD_TIMEOUT_MS = parsePositiveInt(process.env.HF_FOOD_TIMEOUT_MS, 20000);
const HF_AUTH_FAILURE_COOLDOWN_MS = parsePositiveInt(process.env.HF_AUTH_FAILURE_COOLDOWN_MS, 10 * 60 * 1000);
const OPENROUTER_VISION_MODEL = String(process.env.OPENROUTER_VISION_MODEL || 'openai/gpt-4o-mini').trim();
const OPENROUTER_VISION_TIMEOUT_MS = parsePositiveInt(process.env.OPENROUTER_VISION_TIMEOUT_MS, 45000);
let hfAuthFailureSkipUntil = 0;

const GLOBAL_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS);
const GLOBAL_RATE_LIMIT_MAX = parsePositiveInt(process.env.RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX);
const AI_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.AI_RATE_LIMIT_WINDOW_MS, DEFAULT_AI_RATE_LIMIT_WINDOW_MS);
const AI_RATE_LIMIT_MAX = parsePositiveInt(process.env.AI_RATE_LIMIT_MAX, DEFAULT_AI_RATE_LIMIT_MAX);
const RECIPE_RATE_LIMIT_WINDOW_MS = parsePositiveInt(
    process.env.RECIPE_RATE_LIMIT_WINDOW_MS,
    DEFAULT_RECIPE_RATE_LIMIT_WINDOW_MS,
);
const RECIPE_RATE_LIMIT_MAX = parsePositiveInt(process.env.RECIPE_RATE_LIMIT_MAX, DEFAULT_RECIPE_RATE_LIMIT_MAX);
const COOKPAD_RATE_LIMIT_WINDOW_MS = parsePositiveInt(
    process.env.COOKPAD_RATE_LIMIT_WINDOW_MS,
    DEFAULT_COOKPAD_RATE_LIMIT_WINDOW_MS,
);
const COOKPAD_RATE_LIMIT_MAX = parsePositiveInt(process.env.COOKPAD_RATE_LIMIT_MAX, DEFAULT_COOKPAD_RATE_LIMIT_MAX);
const WEATHER_RATE_LIMIT_WINDOW_MS = parsePositiveInt(
    process.env.WEATHER_RATE_LIMIT_WINDOW_MS,
    DEFAULT_WEATHER_RATE_LIMIT_WINDOW_MS,
);
const WEATHER_RATE_LIMIT_MAX = parsePositiveInt(process.env.WEATHER_RATE_LIMIT_MAX, DEFAULT_WEATHER_RATE_LIMIT_MAX);

const supabaseAdmin =
    SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
        ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
              auth: {
                  autoRefreshToken: false,
                  persistSession: false,
              },
          })
        : null;

const allowedOrigins = new Set(
    (process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
);

if (allowedOrigins.size === 0) {
    if (CORS_ALLOW_LOCALHOST_FALLBACK || IS_TEST_ENV) {
        [
            'http://localhost:19006',
            'http://localhost:3000',
            'http://localhost:8081',
            'http://127.0.0.1:19006',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:8081',
        ].forEach((origin) => allowedOrigins.add(origin));

        logger.warn(
            {
                route: 'startup',
                env: NODE_ENV,
            },
            'CORS_ALLOWED_ORIGINS is empty; localhost fallback is enabled explicitly.',
        );
    } else {
        logger.fatal(
            {
                route: 'startup',
                env: NODE_ENV,
                errorMessage:
                    'CORS_ALLOWED_ORIGINS must be configured. Set CORS_ALLOW_LOCALHOST_FALLBACK=true for local-only development.',
            },
            'Backend configuration error',
        );
        throw new Error(
            'CORS_ALLOWED_ORIGINS must be configured. Set CORS_ALLOW_LOCALHOST_FALLBACK=true for local-only development.',
        );
    }
}

const sendError = (res, statusCode, message, code = 'REQUEST_ERROR') => {
    res.status(statusCode).json({
        error: message,
        code,
    });
};

const getBearerToken = (req) => {
    const authorizationHeader = req.header('authorization');
    if (!authorizationHeader) {
        return null;
    }

    const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
    if (!scheme || !token || !/^Bearer$/i.test(scheme)) {
        return null;
    }

    return token;
};

const requireAuthenticatedSupabaseUser = async (req, res, next) => {
    if (req.authenticatedUser?.id) {
        return next();
    }

    const accessToken = getBearerToken(req);
    if (!accessToken) {
        return sendError(res, 401, 'Missing or invalid bearer token.', 'UNAUTHORIZED_USER');
    }

    if (!supabaseAdmin) {
        logger.error(
            {
                route: req.originalUrl || req.url,
                errorMessage: 'Supabase admin client is not configured.',
            },
            'Session authentication configuration error',
        );
        return sendError(res, 500, 'Session authentication is not configured on server.', 'CONFIG_ERROR');
    }

    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data?.user?.id) {
        logger.warn(
            {
                route: req.originalUrl || req.url,
                errorMessage: error?.message || 'Invalid access token.',
            },
            'User authentication failed',
        );
        return sendError(res, 401, 'Invalid or expired session token.', 'UNAUTHORIZED_USER');
    }

    req.authenticatedUser = data.user;
    return next();
};

const requireApiSession = (req, res, next) => {
    if (!REQUIRE_API_SESSION || req.method === 'OPTIONS' || req.path === '/healthz' || req.path === '/api/healthz') {
        return next();
    }

    return requireAuthenticatedSupabaseUser(req, res, next);
};

const ALLOWED_IMAGE_PREFIXES = [
    'data:image/jpeg;base64,',
    'data:image/jpg;base64,',
    'data:image/png;base64,',
    'data:image/webp;base64,',
];
const hasValidImagePrefix = (image) => ALLOWED_IMAGE_PREFIXES.some((prefix) => image.toLowerCase().startsWith(prefix));

const buildOpenRouterHeaders = (apiKey) => {
    const headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };
    if (/openrouter\.ai/i.test(CHAT_COMPLETIONS_URL)) {
        if (OPENROUTER_SITE_URL) {
            headers['HTTP-Referer'] = OPENROUTER_SITE_URL;
        }
        if (OPENROUTER_APP_NAME) {
            headers['X-Title'] = OPENROUTER_APP_NAME;
        }
    }
    return headers;
};

const parseJsonFromModelContent = (content) => {
    const raw = String(content || '').trim();
    if (!raw) {
        return null;
    }

    const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fencedMatch?.[1] ? fencedMatch[1].trim() : raw;
    try {
        return JSON.parse(candidate);
    } catch {
        const arrayStart = candidate.indexOf('[');
        const arrayEnd = candidate.lastIndexOf(']');
        if (arrayStart >= 0 && arrayEnd > arrayStart) {
            try {
                return JSON.parse(candidate.slice(arrayStart, arrayEnd + 1));
            } catch {
                return null;
            }
        }
        const objectStart = candidate.indexOf('{');
        const objectEnd = candidate.lastIndexOf('}');
        if (objectStart >= 0 && objectEnd > objectStart) {
            try {
                return JSON.parse(candidate.slice(objectStart, objectEnd + 1));
            } catch {
                return null;
            }
        }
        return null;
    }
};

const normalizeFoodPredictions = (payload) => {
    const candidateArray = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.predictions)
          ? payload.predictions
          : null;
    if (!Array.isArray(candidateArray) || candidateArray.length === 0) {
        return [];
    }

    const normalized = candidateArray
        .map((item) => {
            const label = String(item?.label || item?.name || '').trim();
            const score = Number(item?.score);
            if (!label || !Number.isFinite(score)) {
                return null;
            }
            const clampedScore = Math.max(0, Math.min(1, score));
            return {
                label,
                score: Math.round(clampedScore * 1000) / 1000,
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

    return normalized;
};

const withTimeout = (promise, timeoutMs, timeoutMessage) =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            const error = new Error(timeoutMessage);
            error.code = 'ECONNABORTED';
            reject(error);
        }, timeoutMs);

        promise
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
    });

const isHfAuthError = (error) => {
    const status = error?.response?.status || error?.httpResponse?.status;
    const upstreamBody = error?.response?.data || error?.httpResponse?.body;
    const message = String(
        upstreamBody?.error || error?.response?.data?.error?.message || error?.message || '',
    ).toLowerCase();
    return status === 401 || status === 403 || message.includes('invalid username or password');
};

const classifyFoodWithOpenRouter = async (imageDataUrl) => {
    if (!CHAT_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is missing.');
    }

    const response = await axios.post(
        CHAT_COMPLETIONS_URL,
        {
            model: OPENROUTER_VISION_MODEL,
            temperature: 0,
            max_tokens: 280,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content:
                        'You classify foods in images. Return valid JSON object with a "predictions" array. Each prediction must include "label" and "score" (0..1).',
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Identify the top food items in this image. Output only JSON object. Example: {"predictions":[{"label":"pizza","score":0.95}]}',
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageDataUrl,
                            },
                        },
                    ],
                },
            ],
        },
        {
            timeout: OPENROUTER_VISION_TIMEOUT_MS,
            headers: buildOpenRouterHeaders(CHAT_API_KEY),
        },
    );

    const content = response?.data?.choices?.[0]?.message?.content;
    const parsed = parseJsonFromModelContent(content);
    const predictions = normalizeFoodPredictions(parsed);

    if (predictions.length === 0) {
        throw new Error('OpenRouter vision returned no valid predictions.');
    }

    return predictions;
};

const createLimiter = (windowMs, max, message) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: message,
            code: 'RATE_LIMITED',
        },
    });

const metricsRegistry = new promClient.Registry();
metricsRegistry.setDefaultLabels({
    service: 'nutrihealth-backend',
    environment: NODE_ENV,
});

const httpRequestsTotal = new promClient.Counter({
    name: 'nutrihealth_http_requests_total',
    help: 'Total number of HTTP requests processed by the backend.',
    labelNames: ['method', 'route', 'status_code'],
    registers: [metricsRegistry],
});

const httpRequestErrorsTotal = new promClient.Counter({
    name: 'nutrihealth_http_request_errors_total',
    help: 'Total number of HTTP responses with status code >= 400.',
    labelNames: ['method', 'route', 'status_code'],
    registers: [metricsRegistry],
});

const httpRequestDurationMilliseconds = new promClient.Histogram({
    name: 'nutrihealth_http_request_duration_ms',
    help: 'HTTP request duration in milliseconds.',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [25, 50, 100, 200, 300, 500, 1000, 2000, 5000],
    registers: [metricsRegistry],
});

const normalizeMetricRoute = (req) => {
    const routePath = req?.route?.path;
    const baseUrl = typeof req?.baseUrl === 'string' ? req.baseUrl : '';
    const fallbackPath = typeof req?.path === 'string' && req.path.length > 0 ? req.path : '/unknown';
    const sourcePath = typeof routePath === 'string' && routePath.length > 0 ? `${baseUrl}${routePath}` : fallbackPath;

    const normalized = sourcePath
        .split('?')[0]
        .split('/')
        .map((segment, index) => {
            if (index === 0 || segment.length === 0) {
                return segment;
            }

            if (/^\d+$/.test(segment)) {
                return ':id';
            }

            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)) {
                return ':id';
            }

            if (/^[A-Za-z0-9_-]{24,}$/.test(segment)) {
                return ':id';
            }

            return segment;
        })
        .join('/');

    return normalized || '/';
};

const normalizeIpAddress = (value) => {
    if (typeof value !== 'string') {
        return null;
    }

    let normalized = value.trim();
    if (!normalized) {
        return null;
    }

    const bracketedIpv6Match = normalized.match(/^\[([^\]]+)\](?::\d+)?$/);
    if (bracketedIpv6Match) {
        normalized = bracketedIpv6Match[1];
    }

    if (normalized.startsWith('::ffff:')) {
        normalized = normalized.slice(7);
    }

    const ipv4WithPortMatch = normalized.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
    if (ipv4WithPortMatch) {
        normalized = ipv4WithPortMatch[1];
    }

    return normalized;
};

const isPrivateIpv4 = (ipAddress) => {
    const match = ipAddress.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!match) {
        return false;
    }

    const octets = match.slice(1).map((value) => Number.parseInt(value, 10));
    if (octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
        return false;
    }

    const [first, second] = octets;
    if (first === 10 || first === 127) {
        return true;
    }

    if (first === 172 && second >= 16 && second <= 31) {
        return true;
    }

    if (first === 192 && second === 168) {
        return true;
    }

    if (first === 169 && second === 254) {
        return true;
    }

    if (first === 100 && second >= 64 && second <= 127) {
        return true;
    }

    return false;
};

const isInternalIpAddress = (ipAddress) => {
    if (!ipAddress) {
        return false;
    }

    if (isPrivateIpv4(ipAddress)) {
        return true;
    }

    const normalized = ipAddress.toLowerCase();
    return (
        normalized === '::1' ||
        normalized === '0:0:0:0:0:0:0:1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:')
    );
};

const getClientIpCandidates = (req) => {
    const forwardedFor = req.header('x-forwarded-for');
    if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
        return forwardedFor
            .split(',')
            .map((entry) => normalizeIpAddress(entry))
            .filter((entry) => Boolean(entry));
    }

    return [req.ip, req.socket?.remoteAddress, req.connection?.remoteAddress]
        .map((entry) => normalizeIpAddress(entry))
        .filter((entry) => Boolean(entry));
};

const isInternalMetricsRequest = (req) => getClientIpCandidates(req).some((entry) => isInternalIpAddress(entry));

app.use(httpLogger);

// Security Middleware
app.use(helmet());
app.use(
    cors({
        origin: (origin, callback) => {
            // Native mobile apps and server-to-server calls often have no Origin header.
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.has(origin)) {
                return callback(null, true);
            }

            return callback(new Error('CORS origin not allowed'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
);
app.use(express.json({ limit: REQUEST_JSON_LIMIT }));
app.use((req, res, next) => {
    if (req.path === '/metrics') {
        return next();
    }

    const stopTimer = httpRequestDurationMilliseconds.startTimer({ method: req.method });
    res.on('finish', () => {
        const labels = {
            method: req.method,
            route: normalizeMetricRoute(req),
            status_code: String(res.statusCode),
        };

        httpRequestsTotal.inc(labels);
        stopTimer(labels);

        if (res.statusCode >= 400) {
            httpRequestErrorsTotal.inc(labels);
        }
    });

    return next();
});

app.get('/metrics', async (req, res) => {
    if (NODE_ENV === 'production' && !isInternalMetricsRequest(req)) {
        return sendError(res, 403, 'Metrics endpoint is restricted to internal requests.', 'FORBIDDEN');
    }

    try {
        res.set('Content-Type', metricsRegistry.contentType);
        res.end(await metricsRegistry.metrics());
    } catch (error) {
        logger.error(
            {
                route: '/metrics',
                errorMessage: error?.message || 'Failed to generate Prometheus metrics payload.',
            },
            'Prometheus metrics endpoint error',
        );
        return sendError(res, 500, 'Failed to generate Prometheus metrics.', 'METRICS_ERROR');
    }

    return undefined;
});

app.get('/api/healthz', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'nutrihealth-backend',
        timestamp: new Date().toISOString(),
        security: {
            cors: allowedOrigins.size > 0,
            rateLimit: true,
            sessionAuth: REQUIRE_API_SESSION,
        },
    });
});

// Rate Limiting
const limiter = createLimiter(
    GLOBAL_RATE_LIMIT_WINDOW_MS,
    GLOBAL_RATE_LIMIT_MAX,
    'Too many requests. Please retry in a few minutes.',
);
const aiLimiter = createLimiter(
    AI_RATE_LIMIT_WINDOW_MS,
    AI_RATE_LIMIT_MAX,
    'AI endpoint rate limit exceeded. Please wait before retrying.',
);
const recipeLimiter = createLimiter(
    RECIPE_RATE_LIMIT_WINDOW_MS,
    RECIPE_RATE_LIMIT_MAX,
    'Recipe import rate limit exceeded. Please wait before retrying.',
);
const cookpadLimiter = createLimiter(
    COOKPAD_RATE_LIMIT_WINDOW_MS,
    COOKPAD_RATE_LIMIT_MAX,
    'Smart cooker rate limit exceeded. Please wait before retrying.',
);
const weatherLimiter = createLimiter(
    WEATHER_RATE_LIMIT_WINDOW_MS,
    WEATHER_RATE_LIMIT_MAX,
    'Weather endpoint rate limit exceeded. Please wait before retrying.',
);

app.use(limiter);
app.use('/api', requireApiSession);
app.use('/api/recipes', recipeLimiter, recipeImportRoutes);
app.use('/api/smart-cooker', cookpadLimiter, smartCookerRoutes);

// --- AI Chat Proxy (OpenRouter-compatible) ---
app.post('/api/chat', aiLimiter, async (req, res) => {
    try {
        const { messages } = req.body;
        const isValidMessages =
            Array.isArray(messages) &&
            messages.length > 0 &&
            messages.length <= 40 &&
            messages.every(
                (message) =>
                    message &&
                    typeof message === 'object' &&
                    ['system', 'user', 'assistant'].includes(message.role) &&
                    typeof message.content === 'string' &&
                    message.content.trim().length > 0 &&
                    message.content.length <= 4000,
            );

        if (!isValidMessages) {
            return sendError(
                res,
                400,
                'Invalid chat payload. Provide a non-empty messages array with role/content items.',
                'INVALID_CHAT_PAYLOAD',
            );
        }

        if (!CHAT_API_KEY) {
            logger.error(
                {
                    route: '/api/chat',
                    errorMessage: 'Chat API key is missing. Configure OPENROUTER_API_KEY.',
                },
                'Missing upstream configuration',
            );
            return sendError(res, 500, 'AI chat configuration error', 'CONFIG_ERROR');
        }

        const chatHeaders = buildOpenRouterHeaders(CHAT_API_KEY);

        const response = await axios.post(
            CHAT_COMPLETIONS_URL,
            {
                model: CHAT_MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024,
                response_format: { type: 'json_object' }, // Force JSON mode if supported or just a hint
            },
            {
                timeout: AI_CHAT_TIMEOUT_MS,
                headers: chatHeaders,
            },
        );

        res.json(response.data);
    } catch (error) {
        logger.error(
            {
                route: '/api/chat',
                errorMessage: error?.message || 'Unknown AI chat proxy error',
                upstreamStatus: error?.response?.status,
                upstreamBody: error?.response?.data,
            },
            'AI chat proxy error',
        );
        const status = error.response?.status || 500;
        const message = error.response?.data?.error?.message || 'Failed to fetch AI chat response';
        sendError(res, status, message, 'AI_UPSTREAM_ERROR');
    }
});

// --- Food Detection Proxy (Hugging Face primary + OpenRouter fallback) ---
app.post('/api/analyze-food', aiLimiter, async (req, res) => {
    const { image } = req.body; // Expecting base64 image
    const isValidImage = typeof image === 'string' && image.trim().length > 0 && image.length <= 5_000_000;

    if (!isValidImage || !hasValidImagePrefix(image)) {
        return sendError(
            res,
            400,
            'Invalid image payload. Expected a data URL image prefix (for example data:image/jpeg;base64,).',
            'INVALID_IMAGE_PAYLOAD',
        );
    }

    const hfToken = String(process.env.HF_API_TOKEN || '').trim();
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    let hfError = null;
    const now = Date.now();
    const hfTemporarilySkipped = now < hfAuthFailureSkipUntil;
    if (hfToken && !hfTemporarilySkipped) {
        try {
            const { HfInference } = require('@huggingface/inference');
            const hf = new HfInference(hfToken);
            const predictions = await withTimeout(
                hf.imageClassification({
                    model: HF_FOOD_MODEL,
                    data: buffer,
                }),
                HF_FOOD_TIMEOUT_MS,
                'Hugging Face food classification timed out.',
            );

            if (Array.isArray(predictions) && predictions.length > 0) {
                return res.json(predictions);
            }

            hfError = new Error('Hugging Face returned no predictions.');
        } catch (error) {
            hfError = error;
            if (isHfAuthError(error)) {
                hfAuthFailureSkipUntil = Date.now() + HF_AUTH_FAILURE_COOLDOWN_MS;
            }
            logger.warn(
                {
                    route: '/api/analyze-food',
                    errorMessage: error?.message || 'Unknown Hugging Face food detection error',
                    upstreamStatus: error?.response?.status || error?.httpResponse?.status,
                    model: HF_FOOD_MODEL,
                    hfAuthFailureSkipForMs: isHfAuthError(error) ? HF_AUTH_FAILURE_COOLDOWN_MS : 0,
                },
                'Hugging Face food detection failed; attempting OpenRouter fallback',
            );
        }
    } else if (hfToken && hfTemporarilySkipped) {
        logger.warn(
            {
                route: '/api/analyze-food',
                errorMessage: 'HF token temporarily skipped after recent authentication failure.',
                skipUntilIso: new Date(hfAuthFailureSkipUntil).toISOString(),
            },
            'Hugging Face food detection skipped; attempting OpenRouter fallback',
        );
    } else {
        logger.warn(
            {
                route: '/api/analyze-food',
                errorMessage: 'HF_API_TOKEN is missing.',
            },
            'Hugging Face food detection skipped; attempting OpenRouter fallback',
        );
    }

    if (CHAT_API_KEY) {
        try {
            const predictions = await classifyFoodWithOpenRouter(image);
            return res.json(predictions);
        } catch (fallbackError) {
            logger.error(
                {
                    route: '/api/analyze-food',
                    errorMessage: fallbackError?.message || 'Unknown OpenRouter vision error',
                    upstreamStatus: fallbackError?.response?.status,
                    upstreamBody: fallbackError?.response?.data,
                    model: OPENROUTER_VISION_MODEL,
                },
                'OpenRouter vision fallback failed',
            );

            const fallbackStatus = fallbackError?.response?.status || 502;
            const fallbackMessage =
                fallbackError?.response?.data?.error?.message ||
                fallbackError?.message ||
                'Failed to analyze food image with fallback model.';
            return sendError(res, fallbackStatus, fallbackMessage, 'AI_UPSTREAM_ERROR');
        }
    }

    if (hfError) {
        const upstreamStatus = hfError?.response?.status || hfError?.httpResponse?.status || 500;
        const upstreamBody = hfError?.response?.data || hfError?.httpResponse?.body;
        const upstreamErrorMessage =
            upstreamBody?.error ||
            hfError?.response?.data?.error?.message ||
            hfError?.message ||
            'Unknown HF proxy error';

        if (hfError.code === 'ECONNABORTED') {
            return sendError(res, 504, 'Food analysis timed out. Please retry in a few seconds.', 'HF_TIMEOUT');
        }
        if (upstreamStatus === 429) {
            return sendError(res, 429, 'AI service is busy right now. Please retry shortly.', 'HF_RATE_LIMIT');
        }
        if (
            upstreamStatus === 401 ||
            upstreamStatus === 403 ||
            /invalid username or password/i.test(String(upstreamErrorMessage))
        ) {
            return sendError(
                res,
                500,
                'Hugging Face token is invalid or expired and OpenRouter fallback is unavailable. Update HF_API_TOKEN or OPENROUTER_API_KEY.',
                'CONFIG_ERROR',
            );
        }
        if (upstreamStatus >= 500) {
            return sendError(
                res,
                503,
                'Food analysis service is temporarily unavailable. Please retry.',
                'HF_UPSTREAM_UNAVAILABLE',
            );
        }

        return sendError(res, upstreamStatus, upstreamBody?.error || 'Failed to analyze food image', 'HF_ERROR');
    }

    return sendError(
        res,
        500,
        'No AI food detection provider is configured. Set HF_API_TOKEN or OPENROUTER_API_KEY.',
        'CONFIG_ERROR',
    );
});

// --- Account Deletion ---
app.delete('/api/account', requireAuthenticatedSupabaseUser, async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return sendError(res, 500, 'Account deletion is not configured on server.', 'CONFIG_ERROR');
        }

        const userId = req.authenticatedUser.id;
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId, false);

        if (error) {
            logger.error(
                {
                    route: '/api/account',
                    userId,
                    errorMessage: error.message,
                },
                'Supabase account deletion failed',
            );
            return sendError(res, 500, 'Failed to delete account.', 'ACCOUNT_DELETE_FAILED');
        }

        return res.status(200).json({
            success: true,
            deletedUserId: userId,
        });
    } catch (error) {
        logger.error(
            {
                route: '/api/account',
                errorMessage: error?.message || 'Unknown account deletion error',
            },
            'Account deletion error',
        );
        return sendError(res, 500, 'Failed to delete account.', 'ACCOUNT_DELETE_FAILED');
    }
});

// --- Weather API Proxy ---
app.get('/api/weather', weatherLimiter, async (req, res) => {
    try {
        const { lat, lon, city } = req.query;

        if (!process.env.OPENWEATHER_API_KEY) {
            return sendError(res, 500, 'OpenWeather API Key not configured on server', 'CONFIG_ERROR');
        }

        const params = {
            appid: process.env.OPENWEATHER_API_KEY,
            units: 'metric',
        };

        const hasLatLon = lat !== undefined && lon !== undefined;
        const hasCity = typeof city === 'string' && city.trim().length > 0;

        if (hasLatLon) {
            const parsedLat = Number.parseFloat(String(lat));
            const parsedLon = Number.parseFloat(String(lon));

            if (
                !Number.isFinite(parsedLat) ||
                !Number.isFinite(parsedLon) ||
                parsedLat < -90 ||
                parsedLat > 90 ||
                parsedLon < -180 ||
                parsedLon > 180
            ) {
                return sendError(res, 400, 'Invalid latitude/longitude values.', 'INVALID_LOCATION');
            }

            params.lat = parsedLat;
            params.lon = parsedLon;
        } else if (hasCity) {
            const normalizedCity = city.trim();
            if (normalizedCity.length > 120) {
                return sendError(res, 400, 'City name is too long.', 'INVALID_LOCATION');
            }
            params.q = normalizedCity;
        } else {
            return sendError(res, 400, 'Missing location parameters (lat/lon or city).', 'INVALID_LOCATION');
        }

        const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
            timeout: 15000,
            params: params,
        });

        res.json(response.data);
    } catch (error) {
        logger.error(
            {
                route: '/api/weather',
                errorMessage: error?.message || 'Unknown weather proxy error',
                upstreamStatus: error?.response?.status,
                upstreamBody: error?.response?.data,
            },
            'Weather API proxy error',
        );
        sendError(res, 500, 'Failed to fetch weather data', 'WEATHER_ERROR');
    }
});

app.use((error, req, res, next) => {
    if (error?.message === 'CORS origin not allowed') {
        logger.warn(
            {
                route: req?.originalUrl || req?.url || 'unknown',
                errorMessage: error.message,
            },
            'Request blocked by CORS policy',
        );
        return sendError(res, 403, 'Origin is not allowed by CORS policy.', 'CORS_BLOCKED');
    }

    logger.error(
        {
            route: req?.originalUrl || req?.url || 'unknown',
            errorMessage: error?.message || 'Unhandled server error',
        },
        'Unhandled backend error',
    );
    return next(error);
});

if (require.main === module) {
    app.listen(PORT, () => {
        logger.info(
            {
                route: 'startup',
                port: Number(PORT),
                env: NODE_ENV,
            },
            'Server started',
        );
    });
}

module.exports = app;
