export * from './nutrition';

import { calculateBMI as calculateClinicalBMI, getBMICategory as getClinicalBMICategory } from './nutrition/clinical';

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
