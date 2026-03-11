const express = require('express');
const {
    suggestSmartCookerRecipes,
    searchCookpadRecipesFromIngredients,
    getSmartCookerRecipeById,
    searchSmartCookerCatalog,
    estimateSmartCookerNutrition,
    searchSmartCookerCookpadDetails,
} = require('../services/smartCookerSuggestionService');
const { logger } = require('../utils/logger');

const router = express.Router();

router.get('/recipe/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const recipe = getSmartCookerRecipeById(id);
        return res.status(200).json(recipe);
    } catch (error) {
        const code = error?.code || 'UNKNOWN';
        const statusByCode = {
            INVALID_ID: 400,
            NOT_FOUND: 404,
        };
        const status = statusByCode[code] || error?.status || 500;

        logger.warn(
            {
                route: '/api/smart-cooker/recipe/:id',
                cookpadId: id,
                errorCode: code,
                errorMessage: error?.message || 'Unknown smart cooker route error',
            },
            'Smart cooker recipe request failed',
        );

        return res.status(status).json({
            error: error?.message || 'Failed to fetch recipe',
            code,
        });
    }
});

router.get('/catalog', async (req, res) => {
    try {
        const payload = {
            query: req.query?.query || req.query?.q || '',
            lang: req.query?.lang || req.query?.language || 'ar',
            limit: req.query?.limit,
        };

        const catalogResponse = searchSmartCookerCatalog(payload);
        return res.status(200).json(catalogResponse);
    } catch (error) {
        const code = error?.code || 'CATALOG_ERROR';
        const statusByCode = {
            INVALID_PAYLOAD: 400,
            CATALOG_ERROR: 500,
        };
        const status = statusByCode[code] || error?.status || 500;

        logger.warn(
            {
                route: '/api/smart-cooker/catalog',
                errorCode: code,
                errorMessage: error?.message || 'Unknown smart cooker catalog error',
            },
            'Smart cooker catalog request failed',
        );

        return res.status(status).json({
            error: error?.message || 'Failed to load catalog',
            code,
        });
    }
});

router.post('/estimate', async (req, res) => {
    try {
        const estimate = estimateSmartCookerNutrition(req.body || {});
        return res.status(200).json(estimate);
    } catch (error) {
        const code = error?.code || 'ESTIMATE_ERROR';
        const statusByCode = {
            INVALID_PAYLOAD: 400,
            INVALID_ID: 400,
            NOT_FOUND: 404,
            ESTIMATE_ERROR: 500,
        };
        const status = statusByCode[code] || error?.status || 500;

        logger.warn(
            {
                route: '/api/smart-cooker/estimate',
                errorCode: code,
                errorMessage: error?.message || 'Unknown smart cooker estimate error',
            },
            'Smart cooker estimate request failed',
        );

        return res.status(status).json({
            error: error?.message || 'Failed to estimate nutrition',
            code,
        });
    }
});

router.post('/suggest', async (req, res) => {
    try {
        const suggestions = suggestSmartCookerRecipes(req.body || {});
        return res.status(200).json(suggestions);
    } catch (error) {
        const code = error?.code || 'SUGGESTION_ERROR';
        const statusByCode = {
            INVALID_PAYLOAD: 400,
            SUGGESTION_ERROR: 500,
        };
        const status = statusByCode[code] || error?.status || 500;

        logger.warn(
            {
                route: '/api/smart-cooker/suggest',
                errorCode: code,
                errorMessage: error?.message || 'Unknown smart cooker suggest error',
            },
            'Smart cooker suggestion request failed',
        );

        return res.status(status).json({
            error: error?.message || 'Failed to generate suggestions',
            code,
        });
    }
});

router.post('/search', async (req, res) => {
    try {
        const suggestions = searchCookpadRecipesFromIngredients(req.body || {});
        return res.status(200).json(suggestions);
    } catch (error) {
        const code = error?.code || 'SUGGESTION_ERROR';
        const statusByCode = {
            INVALID_PAYLOAD: 400,
            SUGGESTION_ERROR: 500,
        };
        const status = statusByCode[code] || error?.status || 500;

        logger.warn(
            {
                route: '/api/smart-cooker/search',
                errorCode: code,
                errorMessage: error?.message || 'Unknown smart cooker search error',
            },
            'Smart cooker ingredient search request failed',
        );

        return res.status(status).json({
            error: error?.message || 'Failed to search recipes',
            code,
        });
    }
});

router.get('/cookpad-details', async (req, res) => {
    try {
        const payload = {
            query: req.query?.query || req.query?.q || '',
            recipe_query: req.query?.recipe_query || '',
            recipe_id: req.query?.recipe_id || '',
        };

        const details = await searchSmartCookerCookpadDetails(payload);
        return res.status(200).json(details);
    } catch (error) {
        const code = error?.code || 'SUGGESTION_ERROR';
        const statusByCode = {
            INVALID_PAYLOAD: 400,
            INVALID_ID: 400,
            NOT_FOUND: 404,
            ROBOTS_BLOCKED: 403,
            UPSTREAM_RATE_LIMIT: 429,
            NETWORK: 503,
            SEARCH_FAILED: 500,
            PARSE: 500,
            SUGGESTION_ERROR: 500,
        };
        const status = statusByCode[code] || error?.status || 500;

        logger.warn(
            {
                route: '/api/smart-cooker/cookpad-details',
                errorCode: code,
                errorMessage: error?.message || 'Unknown cookpad details error',
            },
            'Smart cooker cookpad details request failed',
        );

        return res.status(status).json({
            error: error?.message || 'Failed to load Cookpad details',
            code,
        });
    }
});

module.exports = router;
