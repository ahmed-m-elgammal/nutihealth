const express = require('express');
const { parseRecipeFromUrl } = require('../services/recipeParserService');

const router = express.Router();
const MAX_URL_LENGTH = 2048;

function normalizeRecipeUrl(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
        return null;
    }

    try {
        const parsed = new URL(trimmed);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
}

/**
 * POST /api/recipes/import
 * Body: { url: string }
 */
router.post('/import', async (req, res) => {
    const normalizedUrl = normalizeRecipeUrl(req.body?.url);

    if (!normalizedUrl) {
        return res.status(400).json({
            error: 'Please enter a valid recipe URL',
            code: 'INVALID_URL',
        });
    }

    try {
        const recipe = await parseRecipeFromUrl(normalizedUrl);
        return res.json(recipe);
    } catch (error) {
        const code = error.code || 'UNKNOWN';
        const message = error.message || "Couldn't parse this recipe. Manual entry available";

        if (code === 'INVALID_URL') {
            return res.status(400).json({ error: 'Please enter a valid recipe URL', code });
        }

        if (code === 'NO_RECIPE') {
            return res.status(404).json({
                error: "Couldn't find recipe data. Try another URL",
                code,
            });
        }

        if (code === 'NETWORK') {
            return res.status(503).json({
                error: 'Connection failed. Check your internet',
                code,
            });
        }

        if (code === 'PARSE') {
            return res.status(422).json({
                error: "Couldn't parse this recipe. Manual entry available",
                code: 'PARSE_ERROR',
            });
        }

        console.error('[recipe-import] parser error:', error);
        return res.status(422).json({
            error: message || "Couldn't parse this recipe. Manual entry available",
            code: 'PARSE_ERROR',
        });
    }
});

module.exports = router;
