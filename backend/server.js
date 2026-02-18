const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const recipeImportRoutes = require('./routes/recipeImport');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 100;
const DEFAULT_AI_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_AI_RATE_LIMIT_MAX = 20;
const DEFAULT_RECIPE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RECIPE_RATE_LIMIT_MAX = 30;
const REQUEST_JSON_LIMIT = process.env.REQUEST_JSON_LIMIT || '6mb';

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const GLOBAL_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS);
const GLOBAL_RATE_LIMIT_MAX = parsePositiveInt(process.env.RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX);
const AI_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.AI_RATE_LIMIT_WINDOW_MS, DEFAULT_AI_RATE_LIMIT_WINDOW_MS);
const AI_RATE_LIMIT_MAX = parsePositiveInt(process.env.AI_RATE_LIMIT_MAX, DEFAULT_AI_RATE_LIMIT_MAX);
const RECIPE_RATE_LIMIT_WINDOW_MS = parsePositiveInt(
    process.env.RECIPE_RATE_LIMIT_WINDOW_MS,
    DEFAULT_RECIPE_RATE_LIMIT_WINDOW_MS,
);
const RECIPE_RATE_LIMIT_MAX = parsePositiveInt(process.env.RECIPE_RATE_LIMIT_MAX, DEFAULT_RECIPE_RATE_LIMIT_MAX);

const allowedOrigins = new Set(
    (process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
);

if (allowedOrigins.size === 0 && NODE_ENV !== 'production') {
    [
        'http://localhost:19006',
        'http://localhost:3000',
        'http://localhost:8081',
        'http://127.0.0.1:19006',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8081',
    ].forEach((origin) => allowedOrigins.add(origin));
}

const sendError = (res, statusCode, message, code = 'REQUEST_ERROR') => {
    res.status(statusCode).json({
        error: message,
        code,
    });
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

app.get('/api/healthz', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'nutrihealth-backend',
        timestamp: new Date().toISOString(),
        security: {
            cors: allowedOrigins.size > 0 || NODE_ENV !== 'production',
            rateLimit: true,
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

app.use(limiter);
app.use('/api/recipes', recipeLimiter, recipeImportRoutes);

// --- Groq API Proxy ---
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

        if (!process.env.GROQ_API_KEY) {
            console.error('Groq API Key missing');
            return sendError(res, 500, 'Groq API Configuration Error', 'CONFIG_ERROR');
        }

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama3-70b-8192',
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024,
                response_format: { type: 'json_object' }, // Force JSON mode if supported or just a hint
            },
            {
                timeout: 30000,
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        res.json(response.data);
    } catch (error) {
        console.error('Groq API Error:', error.response?.data || error.message);
        const status = error.response?.status || 500;
        const message = error.response?.data?.error?.message || 'Failed to fetch from Groq API';
        sendError(res, status, message, 'GROQ_ERROR');
    }
});

// --- Hugging Face Food Detection Proxy ---
app.post('/api/analyze-food', aiLimiter, async (req, res) => {
    try {
        const { image } = req.body; // Expecting base64 image
        const isValidImage = typeof image === 'string' && image.trim().length > 0 && image.length <= 5_000_000;

        if (!isValidImage) {
            return sendError(
                res,
                400,
                'Invalid image payload. Provide a base64 image string.',
                'INVALID_IMAGE_PAYLOAD',
            );
        }

        if (!process.env.HF_API_TOKEN) {
            console.error('HF API Token missing');
            return sendError(res, 500, 'AI Service Configuration Error', 'CONFIG_ERROR');
        }

        const response = await axios.post(
            'https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224-in21k-finetuned-food101',
            { inputs: image },
            {
                timeout: 30000,
                headers: {
                    Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        const predictions = response.data;
        if (!Array.isArray(predictions) || predictions.length === 0) {
            return sendError(
                res,
                502,
                'AI service returned no predictions for this image. Try a clearer photo.',
                'HF_EMPTY_RESPONSE',
            );
        }

        res.json(predictions);
    } catch (error) {
        console.error('HF API Error:', error.response?.data || error.message);

        if (error.code === 'ECONNABORTED') {
            return sendError(res, 504, 'Food analysis timed out. Please retry in a few seconds.', 'HF_TIMEOUT');
        }

        const status = error.response?.status || 500;
        if (status === 429) {
            return sendError(res, 429, 'AI service is busy right now. Please retry shortly.', 'HF_RATE_LIMIT');
        }

        if (status >= 500) {
            return sendError(
                res,
                503,
                'Food analysis service is temporarily unavailable. Please retry.',
                'HF_UPSTREAM_UNAVAILABLE',
            );
        }

        const message = error.response?.data?.error || 'Failed to analyze food image';
        sendError(res, status, message, 'HF_ERROR');
    }
});

// --- Weather API Proxy ---
app.get('/api/weather', async (req, res) => {
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
        console.error('Weather API Error:', error.response?.data || error.message);
        sendError(res, 500, 'Failed to fetch weather data', 'WEATHER_ERROR');
    }
});

app.use((error, _req, res, next) => {
    if (error?.message === 'CORS origin not allowed') {
        return sendError(res, 403, 'Origin is not allowed by CORS policy.', 'CORS_BLOCKED');
    }
    return next(error);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
