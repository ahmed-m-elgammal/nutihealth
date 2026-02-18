import { recommendProgramsForUser } from '../workout/recommendations';

describe('recommendProgramsForUser', () => {
    it('prioritizes programs aligned with user goal, frequency, and equipment', () => {
        const recommendations = recommendProgramsForUser(
            {
                goal: 'gain',
                activityLevel: 'moderate',
                workoutPreferences: {
                    fitnessLevel: 'intermediate',
                    daysPerWeek: 4,
                    availableEquipment: ['barbell', 'dumbbells', 'bodyweight'],
                    goals: ['muscle_gain'],
                },
            },
            [
                {
                    id: 'strength_4d',
                    name: 'Strength Builder',
                    level: 'intermediate',
                    durationWeeks: 10,
                    daysPerWeek: 4,
                    category: 'strength',
                    equipment: ['barbell', 'dumbbells'],
                    averageSessionDuration: 55,
                },
                {
                    id: 'fatloss_6d',
                    name: 'Cutting Circuit',
                    level: 'intermediate',
                    durationWeeks: 8,
                    daysPerWeek: 6,
                    category: 'fat_loss',
                    equipment: ['bodyweight'],
                    averageSessionDuration: 35,
                },
            ],
            []
        );

        expect(recommendations[0].programId).toBe('strength_4d');
        expect(recommendations[0].score).toBeGreaterThan(recommendations[1].score);
    });

    it('increases confidence when enough recent workout data exists', () => {
        const now = Date.now();
        const workouts = Array.from({ length: 12 }, (_, index) => ({
            startedAt: now - (index * 2 * 24 * 60 * 60 * 1000),
            duration: 50,
        }));

        const recommendations = recommendProgramsForUser(
            {
                goal: 'maintain',
                activityLevel: 'very_active',
                workoutPreferences: {
                    fitnessLevel: 'intermediate',
                    daysPerWeek: 5,
                    availableEquipment: ['bodyweight', 'dumbbells'],
                    goals: ['general_fitness'],
                },
            },
            [
                {
                    id: 'balanced_5d',
                    name: 'Balanced 5D',
                    level: 'intermediate',
                    durationWeeks: 8,
                    daysPerWeek: 5,
                    category: 'strength',
                    equipment: ['bodyweight', 'dumbbells'],
                    averageSessionDuration: 50,
                },
            ],
            workouts
        );

        expect(recommendations[0].confidence).toBe('high');
        expect(recommendations[0].reasons.length).toBeGreaterThan(0);
    });
});
