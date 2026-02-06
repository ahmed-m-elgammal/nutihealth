/**
 * Format a number with locale-specific formatting
 * @param value - Number to format
 * @param options - Intl.NumberFormatOptions
 * @returns Formatted number string
 */
export function formatNumber(
    value: number,
    options?: Intl.NumberFormatOptions
): string {
    return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Format a number to fixed decimal places
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number string
 */
export function formatDecimal(value: number, decimals: number = 1): string {
    return value.toFixed(decimals);
}

/**
 * Format a number as a percentage
 * @param value - Number to format (0-100 or 0-1)
 * @param asDecimal - If true, treats input as 0-1 range (default: false)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, asDecimal: boolean = false): string {
    const percent = asDecimal ? value * 100 : value;
    return `${Math.round(percent)}%`;
}

/**
 * Format a calorie value
 * @param calories - Calorie value
 * @param includeUnit - Whether to include "cal" suffix (default: true)
 * @returns Formatted calorie string
 */
export function formatCalories(calories: number, includeUnit: boolean = true): string {
    const rounded = Math.round(calories);
    return includeUnit ? `${rounded} cal` : rounded.toString();
}

/**
 * Format a weight value
 * @param weight - Weight in kg
 * @param unit - 'kg' or 'lb' (default: 'kg')
 * @param includeUnit - Whether to include unit suffix (default: true)
 * @returns Formatted weight string
 */
export function formatWeight(
    weight: number,
    unit: 'kg' | 'lb' = 'kg',
    includeUnit: boolean = true
): string {
    const value = unit === 'lb' ? kgToLb(weight) : weight;
    const formatted = formatDecimal(value, 1);
    return includeUnit ? `${formatted} ${unit}` : formatted;
}

/**
 * Format a distance value
 * @param distance - Distance in km
 * @param unit - 'km' or 'mi' (default: 'km')
 * @param includeUnit - Whether to include unit suffix (default: true)
 * @returns Formatted distance string
 */
export function formatDistance(
    distance: number,
    unit: 'km' | 'mi' = 'km',
    includeUnit: boolean = true
): string {
    const value = unit === 'mi' ? kmToMiles(distance) : distance;
    const formatted = formatDecimal(value, 2);
    return includeUnit ? `${formatted} ${unit}` : formatted;
}

/**
 * Format a height value
 * @param height - Height in cm
 * @param unit - 'cm' or 'ft' (default: 'cm')
 * @returns Formatted height string
 */
export function formatHeight(height: number, unit: 'cm' | 'ft' = 'cm'): string {
    if (unit === 'cm') {
        return `${Math.round(height)} cm`;
    }

    // Convert to feet and inches
    const totalInches = height / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
}

/**
 * Format a water amount
 * @param amount - Amount in ml
 * @param unit - 'ml' or 'oz' (default: 'ml')
 * @returns Formatted water amount string
 */
export function formatWater(amount: number, unit: 'ml' | 'oz' = 'ml'): string {
    if (unit === 'oz') {
        const oz = Math.round(amount / 29.5735);
        return `${oz} oz`;
    }

    return `${Math.round(amount)} ml`;
}

/**
 * Format a large number with K/M suffix
 * @param value - Number to format
 * @returns Formatted string with suffix
 */
export function formatCompact(value: number): string {
    if (value >= 1000000) {
        return `${formatDecimal(value / 1000000, 1)}M`;
    }
    if (value >= 1000) {
        return `${formatDecimal(value / 1000, 1)}K`;
    }
    return value.toString();
}

/**
 * Format a number range
 * @param min - Minimum value
 * @param max - Maximum value
 * @param unit - Optional unit suffix
 * @returns Formatted range string
 */
export function formatRange(min: number, max: number, unit?: string): string {
    const minStr = formatDecimal(min, 1);
    const maxStr = formatDecimal(max, 1);
    const suffix = unit ? ` ${unit}` : '';
    return `${minStr}-${maxStr}${suffix}`;
}

// Unit conversion helpers
function kgToLb(kg: number): number {
    return kg * 2.20462;
}

function lbToKg(lb: number): number {
    return lb / 2.20462;
}

function kmToMiles(km: number): number {
    return km * 0.621371;
}

function milesToKm(miles: number): number {
    return miles / 0.621371;
}

export const unitConversion = {
    kgToLb,
    lbToKg,
    kmToMiles,
    milesToKm,
};
