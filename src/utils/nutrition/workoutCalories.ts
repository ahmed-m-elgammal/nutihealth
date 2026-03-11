/**
 * MET-based calorie burn estimation.
 * Formula: calories = MET × weight_kg × duration_hours
 * MET values from Compendium of Physical Activities (Ainsworth 2011).
 */

export type WorkoutIntensity = 'light' | 'moderate' | 'heavy';

// MET values by intensity
const MET: Record<WorkoutIntensity, number> = {
    light: 3.5, // light yoga, walking, stretching
    moderate: 6.0, // cycling, bodyweight circuits, moderate cardio
    heavy: 9.0, // HIIT, heavy strength training, CrossFit
};

// Infer intensity from workout type name when no explicit intensity column is set
export function inferIntensityFromName(name?: string): WorkoutIntensity {
    const n = (name || '').toLowerCase();
    if (/hiit|strength|power|crossfit|metcon|sprint/.test(n)) return 'heavy';
    if (/cardio|conditioning|hypertrophy|full.?body|cycling/.test(n)) return 'moderate';
    return 'light';
}

/**
 * @param weightKg       User body weight
 * @param durationMin    Elapsed workout minutes
 * @param intensity      'light' | 'moderate' | 'heavy'
 */
export function estimateCaloriesBurned(
    weightKg: number,
    durationMin: number,
    intensity: WorkoutIntensity = 'moderate',
): number {
    if (weightKg <= 0 || durationMin <= 0) return 0;
    const met = MET[intensity];
    const hours = durationMin / 60;
    return Math.round(met * weightKg * hours);
}
