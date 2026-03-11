const {
    normalizeArabicText,
    normalizeIngredient,
    normalizeIngredients,
    canonicalizeIngredientName,
    parseQuantityAndUnit,
} = require('../services/arabicIngredientNormalizationService');

describe('arabicIngredientNormalizationService', () => {
    // ─── basic normalization ────────────────────────────────────────
    test('normalizes Arabic ingredient with quantity and unit', () => {
        const normalized = normalizeIngredient('٣ ملاعق كبيرة زيت زيتون');

        expect(normalized.quantity).toBe(3);
        expect(normalized.unit).toBe('tbsp');
        expect(normalized.canonicalName).toBe('Olive Oil');
        expect(normalized.confidence).not.toBe('low');
    });

    test('normalizes ingredient arrays and preserves original values', () => {
        const items = normalizeIngredients(['2 كوب رز', '1 حبة طماطم']);

        expect(items).toHaveLength(2);
        expect(items[0]).toEqual(
            expect.objectContaining({
                original: '2 كوب رز',
                unit: 'cup',
            }),
        );
        expect(items[1].canonicalName).toBe('Tomato');
    });

    // ─── diacritics & text normalization ────────────────────────────
    test('strips Arabic diacritics (tashkeel)', () => {
        const clean = normalizeArabicText('طَمَاطِم');
        expect(clean).not.toMatch(/[\u064B-\u065F\u0670]/);
    });

    test('normalizes different Alef forms to bare Alef', () => {
        const a = normalizeArabicText('أرز');
        const b = normalizeArabicText('إرز');
        const c = normalizeArabicText('آرز');
        // All three should resolve to the same base form
        expect(a).toBe(b);
        expect(b).toBe(c);
    });

    test('normalizes final Ya and Ta-Marbuta', () => {
        const withTaMarbuta = normalizeArabicText('طماطة');
        const withHa = normalizeArabicText('طماطه');
        expect(withTaMarbuta).toBe(withHa);
    });

    test('removes Tatweel (kashida) characters', () => {
        const result = normalizeArabicText('زيـــت');
        expect(result).not.toContain('\u0640');
    });

    // ─── canonicalization & fuzzy matching ──────────────────────────
    test('returns a canonical name for a known ingredient', () => {
        const result = canonicalizeIngredientName('طماطم');
        expect(result).toEqual(
            expect.objectContaining({
                confidence: expect.stringMatching(/^(high|medium)$/),
            }),
        );
        expect(result.canonicalName).toBeTruthy();
    });

    test('returns low confidence for completely unknown ingredient', () => {
        const result = canonicalizeIngredientName('عنصرمجهولتماما');
        expect(result.confidence).toBe('low');
    });

    // ─── quantity & unit parsing ────────────────────────────────────
    test('parses Arabic numeral quantities', () => {
        const result = parseQuantityAndUnit('٢ كوب');
        expect(result.quantity).toBe(2);
        expect(result.unit).toBe('cup');
    });

    test('parses Western numeral quantities', () => {
        const result = parseQuantityAndUnit('3 ملعقة صغيرة');
        expect(result.quantity).toBe(3);
        expect(result.unit).toBe('tsp');
    });

    test('defaults to 1 piece when no quantity/unit is provided', () => {
        const result = parseQuantityAndUnit('طماطم');
        expect(result.quantity).toBe(1);
        expect(result.unit).toBe('piece');
    });

    // ─── edge cases ────────────────────────────────────────────────
    test('handles empty string input gracefully', () => {
        const result = normalizeIngredient('');
        expect(result).toBeDefined();
        expect(result.canonicalName).toBeDefined();
    });

    test('handles string with only numbers', () => {
        const result = normalizeIngredient('123');
        expect(result).toBeDefined();
        expect(result.quantity).toBe(123);
    });

    test('handles mixed Arabic/English input', () => {
        const result = normalizeIngredient('2 cups olive oil');
        expect(result).toBeDefined();
        expect(result.quantity).toBe(2);
    });

    test('normalizes ingredient list with duplicates consistently', () => {
        const items = normalizeIngredients(['طماطم', 'طماطم', 'بصل']);
        expect(items).toHaveLength(3);
        expect(items[0].canonicalName).toBe(items[1].canonicalName);
    });
});
