const {
    normalizeArabicNumerals,
    parseLocalizedNumber,
    normalizeUnit,
    parseIngredientLine,
} = require('../../shared/ingredientParsingCore');

function parseServings(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.round(value);
    }

    if (!value) {
        return 1;
    }

    const parsed = parseLocalizedNumber(String(value).match(/[\d٠-٩.,\/]+/)?.[0] || '');
    if (!parsed || parsed <= 0) {
        return 1;
    }

    return Math.round(parsed);
}

function detectLanguageFromContent({ text = '', url = '' }) {
    const combined = `${text} ${url}`;
    const hasArabic = /[\u0600-\u06FF]/.test(combined);

    if (hasArabic) {
        return 'ar';
    }

    const arabicDomains = ['shahiya.com', 'fatafeat.com', 'webteb.com', 'cbc.softwaresugg.com'];
    const lowerUrl = url.toLowerCase();

    if (arabicDomains.some((domain) => lowerUrl.includes(domain))) {
        return 'ar';
    }

    return 'en';
}

module.exports = {
    normalizeArabicNumerals,
    parseLocalizedNumber,
    normalizeUnit,
    parseIngredientLine,
    parseServings,
    detectLanguageFromContent,
};