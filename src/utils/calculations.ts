export * from './nutrition';

import { calculateBMI as calculateClinicalBMI, getBMICategory as getClinicalBMICategory } from './nutrition/clinical';

/**
 * Estimate calories burned during exercise using MET values.
 */
export function estimateCaloriesBurned(
    weight: number,
    durationMinutes: number,
    intensity: 'low' | 'moderate' | 'high' | 'very_high'
): number {
    const MET_VALUES = {
        low: 3.5,
        moderate: 5.0,
        high: 7.0,
        very_high: 10.0,
    } as const;

    const met = MET_VALUES[intensity];
    const hours = durationMinutes / 60;
    return Math.round(met * weight * hours);
}

/**
 * Calculate Body Mass Index (BMI).
 */
export function calculateBMI(weight: number, height: number): number {
    return calculateClinicalBMI(weight, height);
}

/**
 * Get BMI category based on WHO ranges.
 */
export function getBMICategory(bmi: number): string {
    return getClinicalBMICategory(bmi);
}

/**
 * Calculate ideal weight range based on BMI 18.5-25.
 */
export function getIdealWeightRange(height: number): { min: number; max: number } {
    const heightMeters = height / 100;
    return {
        min: Math.round(18.5 * heightMeters * heightMeters),
        max: Math.round(25 * heightMeters * heightMeters),
    };
}
