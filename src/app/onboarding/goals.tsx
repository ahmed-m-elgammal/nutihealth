import React, { useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, Heart, Trophy, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useOnboardingStore } from '../../store/onboardingStore';
import { ActivityLevel, calculateNutritionTargets, Goal } from '../../utils/calculations';
import { OnboardingStepScreen } from '../../components/onboarding/OnboardingStepScreen';
import { Body, Subheading } from '../../components/ui/Typography';
import { Card, CardContent } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { DEFAULT_PROFILE_VALUES } from '../../utils/profileCompletion';

const GOALS: { id: string; value: Goal; label: string; description: string; icon: any; colorClass: string; bgClass: string }[] = [
    {
        id: 'lose_weight',
        value: 'lose',
        label: 'Lose Weight',
        description: 'Burn fat and improve body composition.',
        icon: TrendingDown,
        colorClass: 'text-red-500',
        bgClass: 'bg-red-100 dark:bg-red-900/30',
    },
    {
        id: 'maintain',
        value: 'maintain',
        label: 'Maintain Weight',
        description: 'Keep your current weight with better consistency.',
        icon: Activity,
        colorClass: 'text-blue-500',
        bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
        id: 'gain_muscle',
        value: 'gain',
        label: 'Build Muscle',
        description: 'Prioritize strength and lean mass gain.',
        icon: TrendingUp,
        colorClass: 'text-orange-500',
        bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
        id: 'general_health',
        value: 'maintain',
        label: 'General Health',
        description: 'Improve daily energy and eating habits.',
        icon: Heart,
        colorClass: 'text-emerald-500',
        bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
];

export default function GoalsScreen() {
    const router = useRouter();
    const { updateData, data } = useOnboardingStore();

    const initialGoal = GOALS.find(goal => goal.value === data.goal)?.value || 'maintain';
    const [selectedGoal, setSelectedGoal] = useState<Goal>(initialGoal);
    const [selectedId, setSelectedId] = useState<string>(
        GOALS.find(goal => goal.value === data.goal)?.id || 'maintain'
    );

    const previewAge = data.age || DEFAULT_PROFILE_VALUES.age;
    const previewSex = data.gender || DEFAULT_PROFILE_VALUES.gender;
    const previewHeight = data.height || DEFAULT_PROFILE_VALUES.height;
    const previewWeight = data.weight || DEFAULT_PROFILE_VALUES.weight;
    const previewActivity = (data.activityLevel as ActivityLevel) || DEFAULT_PROFILE_VALUES.activityLevel;

    const nutritionPreview = useMemo(() => (
        calculateNutritionTargets({
            age: previewAge,
            sex: previewSex,
            heightCm: previewHeight,
            weightKg: previewWeight,
            goal: selectedGoal,
            activityLevel: previewActivity,
            bodyFatPercentage: data.preferences?.bodyFatPercentage,
            isAthlete: data.preferences?.isAthlete,
            hasPCOS: data.preferences?.hasPCOS,
            hasInsulinResistance: data.preferences?.hasInsulinResistance,
            onHormonalContraception: data.preferences?.onHormonalContraception,
            isPostMenopause: data.preferences?.isPostMenopause,
        })
    ), [
        previewAge,
        previewSex,
        previewHeight,
        previewWeight,
        previewActivity,
        selectedGoal,
        data.preferences,
    ]);

    const handleNext = () => {
        updateData({ goal: selectedGoal });
        router.push('/onboarding/activity-level');
    };

    return (
        <OnboardingStepScreen
            stepLabel="Step 2 of 5"
            currentStep={2}
            totalSteps={5}
            title="What is your main goal?"
            description="Goal changes your calorie multipliers and protein targets immediately."
            actionLabel="Continue"
            onActionPress={handleNext}
            onBackPress={() => router.back()}
        >
            {GOALS.map((goal) => {
                const isSelected = selectedId === goal.id;
                const Icon = goal.icon;

                return (
                    <TouchableOpacity
                        key={goal.id}
                        onPress={() => {
                            setSelectedGoal(goal.value);
                            setSelectedId(goal.id);
                        }}
                        activeOpacity={0.8}
                    >
                        <Card
                            className={cn(
                                'border-2 border-border bg-card',
                                isSelected && 'border-primary bg-primary/5'
                            )}
                        >
                            <CardContent className="flex-row items-center p-4">
                                <View className={cn('mr-4 rounded-full p-3', goal.bgClass)}>
                                    <Icon size={22} className={goal.colorClass} />
                                </View>

                                <View className="flex-1">
                                    <Subheading className={cn('text-base', isSelected && 'text-primary')}>
                                        {goal.label}
                                    </Subheading>
                                    <Body className="text-sm text-muted-foreground">{goal.description}</Body>
                                </View>

                                {isSelected && (
                                    <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                                        <Trophy size={14} className="text-primary-foreground" />
                                    </View>
                                )}
                            </CardContent>
                        </Card>
                    </TouchableOpacity>
                );
            })}

            <Card className="border-border bg-card">
                <CardContent className="p-4">
                    <Subheading className="mb-3 text-base">Live Equation Preview</Subheading>
                    <View className="flex-row gap-3">
                        <View className="flex-1 rounded-lg bg-muted/40 p-3">
                            <Body className="text-xs text-muted-foreground">BMR</Body>
                            <Subheading className="text-base">{nutritionPreview.bmr} kcal</Subheading>
                        </View>
                        <View className="flex-1 rounded-lg bg-muted/40 p-3">
                            <Body className="text-xs text-muted-foreground">TDEE</Body>
                            <Subheading className="text-base">{nutritionPreview.tdee} kcal</Subheading>
                        </View>
                        <View className="flex-1 rounded-lg bg-muted/40 p-3">
                            <Body className="text-xs text-muted-foreground">Goal Calories</Body>
                            <Subheading className="text-base">{nutritionPreview.calorieTarget}</Subheading>
                        </View>
                    </View>
                </CardContent>
            </Card>
        </OnboardingStepScreen>
    );
}
