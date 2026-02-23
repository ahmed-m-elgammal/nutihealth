import type Diet from '../../database/models/Diet';
import type User from '../../database/models/User';
import type { DayCalorieAdjustment } from './workoutCalorieAdjuster';

export type TemplateRecommendationTier = 'excellent' | 'strong' | 'average' | 'weak';

export interface TemplateRecommendation {
    templateId: string;
    score: number;
    tier: TemplateRecommendationTier;
    reasons: string[];
}

interface RankOptions {
    templates: Diet[];
    user: User;
    adherenceScore?: number;
    workoutAdjustment?: DayCalorieAdjustment | null;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function normalizeRestriction(value: string) {
    return value.toLowerCase().replace(/[\s_]+/g, '-');
}

function getRestrictionSet(user: User): Set<string> {
    const restrictions = user.preferences?.dietary_restrictions;
    if (!Array.isArray(restrictions)) {
        return new Set();
    }

    return new Set(restrictions.map((value) => normalizeRestriction(String(value))));
}

function buildTemplateRestrictionSet(template: Diet): Set<string> {
    if (!Array.isArray(template.restrictions)) {
        return new Set();
    }

    return new Set(template.restrictions.map((value) => normalizeRestriction(String(value))));
}

function macroFitScore(template: Diet, user: User) {
    const calorieDelta = Math.abs(template.calorieTarget - user.calorieTarget) / Math.max(1, user.calorieTarget);
    const proteinDelta = Math.abs(template.proteinTarget - user.proteinTarget) / Math.max(1, user.proteinTarget);
    const carbsDelta = Math.abs(template.carbsTarget - user.carbsTarget) / Math.max(1, user.carbsTarget);
    const fatsDelta = Math.abs(template.fatsTarget - user.fatsTarget) / Math.max(1, user.fatsTarget);

    const calorieFit = clamp(1 - calorieDelta, 0, 1);
    const proteinFit = clamp(1 - proteinDelta, 0, 1);
    const carbsFit = clamp(1 - carbsDelta, 0, 1);
    const fatsFit = clamp(1 - fatsDelta, 0, 1);

    return Math.round((calorieFit * 0.4 + proteinFit * 0.25 + carbsFit * 0.2 + fatsFit * 0.15) * 100);
}

function goalFitScore(template: Diet, user: User) {
    const proteinDensity = template.proteinTarget / Math.max(1, template.calorieTarget / 1000);
    const carbDensity = template.carbsTarget / Math.max(1, template.calorieTarget / 1000);
    const calorieDrift = template.calorieTarget - user.calorieTarget;

    if (user.goal === 'lose') {
        const calorieScore = calorieDrift <= 0 ? 100 : clamp(100 - (calorieDrift / 30) * 5, 30, 100);
        const proteinScore = clamp((proteinDensity / 75) * 100, 50, 100);
        return Math.round(calorieScore * 0.65 + proteinScore * 0.35);
    }

    if (user.goal === 'gain') {
        const calorieScore = calorieDrift >= 0 ? 100 : clamp(100 - (Math.abs(calorieDrift) / 30) * 5, 25, 100);
        const carbScore = clamp((carbDensity / 115) * 100, 50, 100);
        return Math.round(calorieScore * 0.55 + carbScore * 0.45);
    }

    const closeness = clamp(100 - (Math.abs(calorieDrift) / Math.max(1, user.calorieTarget)) * 100, 40, 100);
    const balance = clamp(
        100 -
            Math.abs(
                template.proteinTarget * 4 +
                    template.carbsTarget * 4 +
                    template.fatsTarget * 9 -
                    template.calorieTarget,
            ) /
                8,
        45,
        100,
    );
    return Math.round(closeness * 0.65 + balance * 0.35);
}

function restrictionFitScore(template: Diet, user: User) {
    const required = getRestrictionSet(user);
    if (required.size === 0) {
        return 100;
    }

    const templateRestrictions = buildTemplateRestrictionSet(template);
    if (templateRestrictions.size === 0) {
        return 45;
    }

    let matches = 0;
    required.forEach((restriction) => {
        if (templateRestrictions.has(restriction)) {
            matches += 1;
        }
    });

    const coverage = matches / required.size;
    return Math.round(clamp(coverage, 0, 1) * 100);
}

function workoutFitScore(template: Diet, workoutAdjustment: DayCalorieAdjustment | null | undefined) {
    if (!workoutAdjustment || workoutAdjustment.workoutIntensity === 'none') {
        return 80;
    }

    const intensity = workoutAdjustment.workoutIntensity;
    const carbsPerKcal = template.carbsTarget / Math.max(1, template.calorieTarget);
    const proteinPerKcal = template.proteinTarget / Math.max(1, template.calorieTarget);

    if (intensity === 'heavy') {
        const carbSupport = clamp((carbsPerKcal / 0.12) * 100, 45, 100);
        const proteinSupport = clamp((proteinPerKcal / 0.05) * 100, 45, 100);
        return Math.round(carbSupport * 0.6 + proteinSupport * 0.4);
    }

    if (intensity === 'moderate') {
        const carbSupport = clamp((carbsPerKcal / 0.1) * 100, 50, 100);
        const proteinSupport = clamp((proteinPerKcal / 0.045) * 100, 50, 100);
        return Math.round(carbSupport * 0.55 + proteinSupport * 0.45);
    }

    return clamp(Math.round((proteinPerKcal / 0.045) * 100), 55, 100);
}

function adherenceFitScore(adherenceScore: number | undefined) {
    if (typeof adherenceScore !== 'number' || Number.isNaN(adherenceScore)) {
        return 80;
    }

    if (adherenceScore >= 90) return 100;
    if (adherenceScore >= 75) return 90;
    if (adherenceScore >= 60) return 80;
    if (adherenceScore >= 45) return 70;
    return 60;
}

function getTier(score: number): TemplateRecommendationTier {
    if (score >= 86) return 'excellent';
    if (score >= 74) return 'strong';
    if (score >= 58) return 'average';
    return 'weak';
}

function buildReasons(
    macroScore: number,
    goalScore: number,
    restrictionScore: number,
    workoutScore: number,
    user: User,
): string[] {
    const reasons: string[] = [];

    if (macroScore >= 85) {
        reasons.push('Very close macro and calorie match to your current targets.');
    } else if (macroScore >= 70) {
        reasons.push('Good macro match with minor adjustments needed.');
    } else {
        reasons.push('Needs notable macro tuning before activation.');
    }

    if (goalScore >= 82) {
        reasons.push(`Strongly aligned with your ${user.goal} goal.`);
    } else if (goalScore >= 65) {
        reasons.push(`Moderately aligned with your ${user.goal} goal.`);
    } else {
        reasons.push(`Limited alignment with your ${user.goal} goal strategy.`);
    }

    if (restrictionScore < 70) {
        reasons.push('May miss one or more of your dietary restriction requirements.');
    } else if (restrictionScore >= 95) {
        reasons.push('Fully compatible with your dietary restrictions.');
    }

    if (workoutScore >= 85) {
        reasons.push('Supports your current workout-day fueling needs.');
    } else if (workoutScore < 65) {
        reasons.push('Workout fueling support is weaker than ideal.');
    }

    return reasons.slice(0, 3);
}

export function rankDietTemplatesForUser({
    templates,
    user,
    adherenceScore,
    workoutAdjustment,
}: RankOptions): TemplateRecommendation[] {
    return templates
        .map((template) => {
            const macroScore = macroFitScore(template, user);
            const goalScore = goalFitScore(template, user);
            const restrictionScore = restrictionFitScore(template, user);
            const workoutScore = workoutFitScore(template, workoutAdjustment);
            const consistencyScore = adherenceFitScore(adherenceScore);

            const score = Math.round(
                macroScore * 0.42 +
                    goalScore * 0.23 +
                    restrictionScore * 0.2 +
                    workoutScore * 0.1 +
                    consistencyScore * 0.05,
            );

            return {
                templateId: template.id,
                score,
                tier: getTier(score),
                reasons: buildReasons(macroScore, goalScore, restrictionScore, workoutScore, user),
            };
        })
        .sort((a, b) => b.score - a.score);
}
