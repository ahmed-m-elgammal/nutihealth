import {
    calculateBMR,
    calculateTDEE,
    calculateCalorieTarget,
    calculateMacros,
    calculateBMI,
    getBMICategory,
    calculateDailyHydration,
    calculateNutritionTargets,
} from '../calculations';

describe('Calculations Utility', () => {
    describe('calculateBMR', () => {
        it('calculates correctly for adult male using Mifflin-St Jeor', () => {
            expect(calculateBMR(80, 180, 30, 'male')).toBe(1780);
        });

        it('calculates correctly for adult female using Mifflin-St Jeor', () => {
            expect(calculateBMR(60, 165, 25, 'female')).toBe(1345.25);
        });

        it('applies senior adjustment for age 60+', () => {
            expect(calculateBMR(80, 180, 70, 'male')).toBeCloseTo(1532.6, 1);
        });

        it('uses pediatric EER equation for ages 6-17', () => {
            const result = calculateBMR(40, 150, 12, 'male', { activityLevel: 'moderate' });
            expect(result).toBeCloseTo(2398.05, 1);
        });

        it('uses adjusted body weight when BMI is obese', () => {
            const result = calculateBMR(120, 170, 40, 'male');
            expect(result).toBeCloseTo(1743.13, 1);
        });
    });

    describe('calculateTDEE', () => {
        it('applies activity multiplier', () => {
            expect(calculateTDEE(2000, 'moderate')).toBe(3100);
        });

        it('applies athlete adjustment for low body-fat athletes', () => {
            const result = calculateTDEE(2000, 'moderate', {
                sex: 'male',
                isAthlete: true,
                bodyFatPercentage: 12,
            });
            expect(result).toBe(3333);
        });

        it('applies very lean adjustment when body fat is below essential threshold', () => {
            const result = calculateTDEE(2000, 'sedentary', {
                sex: 'male',
                bodyFatPercentage: 4,
            });
            expect(result).toBe(2525);
        });

        it('applies metabolic adaptation when progress stalls with good compliance', () => {
            const result = calculateTDEE(2000, 'sedentary', {
                week1WeightKg: 80,
                currentWeightKg: 79.9,
                compliancePercentage: 90,
            });
            expect(result).toBe(2220);
        });
    });

    describe('calculateCalorieTarget', () => {
        it('uses obesity deficit when BMI is 30+', () => {
            const result = calculateCalorieTarget(2800, 'lose', {
                bmi: 32,
                age: 35,
                sex: 'male',
            });
            expect(result).toBe(2100);
        });

        it('uses lean deficit for lean individuals', () => {
            const result = calculateCalorieTarget(2500, 'lose', {
                bmi: 24,
                age: 30,
                sex: 'male',
                bodyFatPercentage: 10,
            });
            expect(result).toBe(2200);
        });

        it('uses standard deficit for general fat loss', () => {
            const result = calculateCalorieTarget(2500, 'lose', {
                bmi: 26,
                age: 30,
                sex: 'male',
            });
            expect(result).toBe(2000);
        });

        it('uses 12% surplus for muscle gain', () => {
            expect(calculateCalorieTarget(2500, 'gain')).toBe(2800);
        });

        it('enforces female hormonal minimum when applicable', () => {
            const result = calculateCalorieTarget(1700, 'lose', {
                bmi: 25,
                age: 30,
                sex: 'female',
                weightKg: 70,
                onHormonalContraception: false,
            });
            expect(result).toBe(1820);
        });
    });

    describe('calculateMacros', () => {
        it('calculates maintenance macros with clinical g/kg equations', () => {
            const result = calculateMacros(2500, 'maintain', {
                age: 30,
                sex: 'male',
                weightKg: 80,
                heightCm: 180,
            });

            expect(result.protein).toBe(128);
            expect(result.carbs).toBe(353);
            expect(result.fats).toBe(64);
            expect(result.totalPercent).toBeGreaterThan(99);
            expect(result.totalPercent).toBeLessThan(101);
        });

        it('applies PCOS carb cap and redistributes calories to fat', () => {
            const result = calculateMacros(2000, 'maintain', {
                age: 30,
                sex: 'female',
                weightKg: 70,
                heightCm: 165,
                hasPCOS: true,
            });

            expect(result.protein).toBe(140);
            expect(result.carbs).toBe(200);
            expect(result.fats).toBe(71);
        });
    });

    describe('BMI Calculations', () => {
        it('calculates BMI correctly', () => {
            expect(calculateBMI(70, 175)).toBe(22.9);
        });

        it('categorizes BMI correctly', () => {
            expect(getBMICategory(18.0)).toBe('Underweight');
            expect(getBMICategory(22.0)).toBe('Normal');
            expect(getBMICategory(27.0)).toBe('Overweight');
            expect(getBMICategory(32.0)).toBe('Obese Class I');
        });
    });

    describe('Hydration', () => {
        it('calculates base hydration plus activity bonus', () => {
            const hydration = calculateDailyHydration(70, 'moderate');

            expect(hydration.baseHydrationMl).toBe(2310);
            expect(hydration.activityBonusMl).toBe(500);
            expect(hydration.totalHydrationMl).toBe(2810);
        });

        it('calculates exercise hydration range and recommended addition', () => {
            const hydration = calculateDailyHydration(70, 'moderate', 1);

            expect(hydration.exerciseAdditionMinMl).toBe(500);
            expect(hydration.exerciseAdditionMaxMl).toBe(1000);
            expect(hydration.exerciseAdditionRecommendedMl).toBe(750);
            expect(hydration.totalHydrationMl).toBe(3560);
        });
    });

    describe('Integrated Nutrition Target Calculation', () => {
        it('returns clinical calories, macros, and hydration together', () => {
            const result = calculateNutritionTargets({
                age: 30,
                sex: 'male',
                heightCm: 180,
                weightKg: 80,
                goal: 'lose',
                activityLevel: 'moderate',
                bodyFatPercentage: 15,
            });

            expect(result.bmr).toBe(1780);
            expect(result.tdee).toBe(2759);
            expect(result.calorieTarget).toBe(2207);
            expect(result.macros.protein).toBeGreaterThan(100);
            expect(result.hydration.totalHydrationMl).toBe(3140);
        });
    });
});
