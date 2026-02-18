import type { UserWorkoutProfile } from '../../types/workout';

export interface ProgramCandidate {
    id: string;
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    durationWeeks: number;
    daysPerWeek: number;
    category?: 'strength' | 'hypertrophy' | 'fat_loss' | 'intro' | 'endurance' | 'mobility';
    equipment: string[];
    averageSessionDuration?: number;
}

export interface WorkoutHistorySample {
    startedAt: number;
    duration: number;
}

export interface UserRecommendationContext {
    goal: 'lose' | 'maintain' | 'gain';
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';
    workoutPreferences?: unknown;
}

export interface ProgramRecommendation {
    programId: string;
    score: number;
    confidence: 'low' | 'medium' | 'high';
    reasons: string[];
    projectedWeeklyMinutes: number;
    rank: number;
}

interface RecommendationBreakdown {
    score: number;
    reasons: { text: string; weight: number }[];
}

const LEVEL_ORDER: Array<'beginner' | 'intermediate' | 'advanced'> = [
    'beginner',
    'intermediate',
    'advanced',
];

const ACTIVITY_TO_DAYS: Record<UserRecommendationContext['activityLevel'], number> = {
    sedentary: 3,
    light: 3,
    moderate: 4,
    very_active: 5,
    athlete: 6,
};

const GOAL_TO_CATEGORIES: Record<UserRecommendationContext['goal'], ProgramCandidate['category'][]> = {
    lose: ['fat_loss', 'endurance', 'intro'],
    maintain: ['strength', 'endurance', 'mobility', 'intro'],
    gain: ['strength', 'hypertrophy'],
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const toWorkoutProfile = (value: unknown): Partial<UserWorkoutProfile> => {
    if (!value || typeof value !== 'object') {
        return {};
    }

    return value as Partial<UserWorkoutProfile>;
};

const getHistoryStats = (workouts: WorkoutHistorySample[]) => {
    const now = Date.now();
    const days28Ms = 28 * 24 * 60 * 60 * 1000;

    const recent = workouts.filter((workout) => workout.startedAt >= now - days28Ms);
    const totalDuration = recent.reduce((sum, workout) => sum + Math.max(0, workout.duration || 0), 0);

    return {
        recentCount: recent.length,
        workoutsPerWeek: recent.length / 4,
        averageDuration: recent.length > 0 ? totalDuration / recent.length : 0,
    };
};

const inferFitnessLevel = (
    profile: Partial<UserWorkoutProfile>,
    context: UserRecommendationContext,
    recentWorkoutsPerWeek: number
): ProgramCandidate['level'] => {
    if (profile.fitnessLevel) {
        return profile.fitnessLevel;
    }

    if (recentWorkoutsPerWeek >= 4.5) {
        return 'advanced';
    }

    if (recentWorkoutsPerWeek >= 2.5) {
        return 'intermediate';
    }

    if (context.activityLevel === 'athlete' || context.activityLevel === 'very_active') {
        return 'intermediate';
    }

    return 'beginner';
};

const inferDesiredDays = (
    profile: Partial<UserWorkoutProfile>,
    context: UserRecommendationContext
): number => {
    const profileDays = profile.daysPerWeek;

    if (typeof profileDays === 'number' && profileDays >= 2 && profileDays <= 7) {
        return profileDays;
    }

    return ACTIVITY_TO_DAYS[context.activityLevel] || 4;
};

const deriveTargetCategories = (
    context: UserRecommendationContext,
    profile: Partial<UserWorkoutProfile>
): ProgramCandidate['category'][] => {
    if (!profile.goals || profile.goals.length === 0) {
        return GOAL_TO_CATEGORIES[context.goal];
    }

    const categories = new Set<ProgramCandidate['category']>();

    profile.goals.forEach((goal) => {
        if (goal === 'muscle_gain' || goal === 'strength') {
            categories.add('strength');
            categories.add('hypertrophy');
        }

        if (goal === 'weight_loss' || goal === 'endurance') {
            categories.add('fat_loss');
            categories.add('endurance');
        }

        if (goal === 'general_fitness') {
            categories.add('intro');
            categories.add('strength');
            categories.add('endurance');
        }
    });

    if (categories.size === 0) {
        return GOAL_TO_CATEGORIES[context.goal];
    }

    return Array.from(categories);
};

const scoreProgram = (
    program: ProgramCandidate,
    context: UserRecommendationContext,
    profile: Partial<UserWorkoutProfile>,
    history: ReturnType<typeof getHistoryStats>
): RecommendationBreakdown => {
    const reasons: { text: string; weight: number }[] = [];

    const inferredFitnessLevel = inferFitnessLevel(profile, context, history.workoutsPerWeek);
    const desiredDays = inferDesiredDays(profile, context);
    const targetCategories = deriveTargetCategories(context, profile);
    const availableEquipment = new Set<string>((profile.availableEquipment || ['bodyweight']).concat('bodyweight'));

    const levelDistance = Math.abs(
        LEVEL_ORDER.indexOf(program.level) - LEVEL_ORDER.indexOf(inferredFitnessLevel)
    );

    const levelScore = levelDistance === 0 ? 22 : levelDistance === 1 ? 14 : 6;
    reasons.push({
        text: levelDistance === 0
            ? `Matches your ${inferredFitnessLevel} fitness level.`
            : `Level is ${program.level}; close to your current readiness.`,
        weight: levelScore,
    });

    const categoryScore = targetCategories.includes(program.category)
        ? 24
        : (program.category === 'strength' && context.goal === 'maintain')
            ? 14
            : 8;

    reasons.push({
        text: targetCategories.includes(program.category)
            ? `Aligned with your goal focus (${context.goal}).`
            : `Less specific to your main goal (${context.goal}).`,
        weight: categoryScore,
    });

    const dayDifference = Math.abs(program.daysPerWeek - desiredDays);
    const daysScore = clamp(22 - (dayDifference * 6), 0, 22);

    reasons.push({
        text: dayDifference <= 1
            ? `Training frequency fits your target (${desiredDays} days/week).`
            : `Frequency differs from your target by ${dayDifference} day(s).`,
        weight: dayDifference <= 1 ? daysScore : -Math.max(4, 14 - daysScore),
    });

    const requiredEquipment = Array.from(new Set(program.equipment.filter(Boolean)));
    const matchedEquipmentCount = requiredEquipment.filter((item) => availableEquipment.has(item)).length;
    const equipmentMatchRatio = requiredEquipment.length > 0
        ? matchedEquipmentCount / requiredEquipment.length
        : 1;
    const equipmentScore = Math.round(18 * equipmentMatchRatio);

    reasons.push({
        text: equipmentMatchRatio >= 1
            ? 'Fully matches your available equipment.'
            : `Needs more equipment (${matchedEquipmentCount}/${requiredEquipment.length} matched).`,
        weight: equipmentMatchRatio >= 1 ? equipmentScore : -Math.max(3, 14 - equipmentScore),
    });

    let adherenceScore = 6;
    if (history.recentCount > 0) {
        const expectedRecentSessions = Math.max(4, desiredDays * 4);
        const adherenceRatio = history.recentCount / expectedRecentSessions;

        if (adherenceRatio >= 0.9) {
            adherenceScore = 10;
            reasons.push({
                text: 'Recent consistency supports progressive programming.',
                weight: 10,
            });
        } else if (adherenceRatio < 0.6 && program.daysPerWeek > desiredDays + 1) {
            adherenceScore = -8;
            reasons.push({
                text: 'Current consistency suggests a slightly lower weekly frequency first.',
                weight: -8,
            });
        }

        if (history.averageDuration > 0 && history.averageDuration < 30 && program.daysPerWeek >= 5) {
            adherenceScore -= 4;
            reasons.push({
                text: 'Session length trend suggests this may feel too dense right now.',
                weight: -4,
            });
        }
    }

    const score = clamp(levelScore + categoryScore + daysScore + equipmentScore + adherenceScore, 0, 100);

    return {
        score,
        reasons,
    };
};

export const recommendProgramsForUser = (
    context: UserRecommendationContext,
    programs: ProgramCandidate[],
    workouts: WorkoutHistorySample[]
): ProgramRecommendation[] => {
    const profile = toWorkoutProfile(context.workoutPreferences);
    const history = getHistoryStats(workouts);

    const recommendations = programs.map((program) => {
        const breakdown = scoreProgram(program, context, profile, history);

        const confidence: ProgramRecommendation['confidence'] = history.recentCount >= 12
            ? 'high'
            : history.recentCount >= 4
                ? 'medium'
                : 'low';

        const reasons = breakdown.reasons
            .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
            .slice(0, 3)
            .map((reason) => reason.text);

        const projectedWeeklyMinutes = Math.round(
            Math.max(25, program.averageSessionDuration || 45) * Math.max(1, program.daysPerWeek)
        );

        return {
            programId: program.id,
            score: breakdown.score,
            confidence,
            reasons: reasons.length > 0 ? reasons : ['Balanced default recommendation.'],
            projectedWeeklyMinutes,
            rank: 0,
        };
    });

    recommendations.sort((a, b) => b.score - a.score);

    return recommendations.map((recommendation, index) => ({
        ...recommendation,
        rank: index + 1,
    }));
};
