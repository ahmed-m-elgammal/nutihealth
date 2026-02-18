import {
    convertAmountBetweenSystems,
    convertArabicNumeralsToEnglish,
    parseIngredientAmount,
    parseLocalizedNumber,
} from '../arabicNumberConverter';

describe('arabicNumberConverter', () => {
    it('converts Arabic numerals to western digits', () => {
        expect(convertArabicNumeralsToEnglish('١٢٣٫٥')).toBe('123.5');
    });

    it('parses localized mixed fractions', () => {
        expect(parseLocalizedNumber('١ ١/٢')).toBe(1.5);
    });

    it('parses Arabic ingredient lines with amount and unit', () => {
        const parsed = parseIngredientAmount('٢ كوب دقيق');

        expect(parsed.amount).toBe(2);
        expect(parsed.unit).toBe('cup');
        expect(parsed.name).toBe('دقيق');
    });

    it('converts imperial units to metric', () => {
        const converted = convertAmountBetweenSystems(1, 'cup', 'metric');

        expect(converted.unit).toBe('ml');
        expect(converted.amount).toBe(240);
    });
});