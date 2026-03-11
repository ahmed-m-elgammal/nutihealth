import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, Heart, Trophy, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Goal } from '../../utils/calculations';
import { OnboardingStepScreen } from '../../components/onboarding/OnboardingStepScreen';
import { Body, Subheading } from '../../components/ui/Typography';
import { Card, CardContent } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { useOnboardingNutritionPreview } from '../../hooks/useOnboardingNutritionPreview';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useOnboardingStore } from '../../store/onboardingStore';

const GOALS: {
    id: string;
    value: Goal;
    label: string;
    description: string;
    icon: any;
    colorClass: string;
    bgClass: string;
    activeStroke: string;
}[] = [
    {
        id: 'lose_weight',
        value: 'lose',
        label: 'Lose Weight',
        description: 'Burn fat and improve body composition.',
        icon: TrendingDown,
        colorClass: 'text-red-500',
        bgClass: 'bg-red-500/10',
        activeStroke: 'text-red-500',
    },
    {
        id: 'maintain',
        value: 'maintain',
        label: 'Maintain Weight',
        description: 'Keep your current weight with better consistency.',
        icon: Activity,
        colorClass: 'text-blue-500',
        bgClass: 'bg-blue-500/10',
        activeStroke: 'text-blue-500',
    },
    {
        id: 'gain_muscle',
        value: 'gain',
        label: 'Build Muscle',
        description: 'Prioritize strength and lean mass gain.',
        icon: TrendingUp,
        colorClass: 'text-orange-500',
        bgClass: 'bg-orange-500/10',
        activeStroke: 'text-orange-500',
    },
    {
        id: 'general_health',
        value: 'general_health',
        label: 'General Health',
        description: 'Support long-term wellness and healthier daily nutrition habits.',
        icon: Heart,
        colorClass: 'text-emerald-500',
        bgClass: 'bg-emerald-500/10',
        activeStroke: 'text-emerald-500',
    },
];

export default function GoalsScreen() {
    const router = useRouter();
    const setCurrentStep = useOnboardingStore((state) => state.setCurrentStep);
    const { data, saveGoal } = useOnboarding();

    const initialGoal = GOALS.some((goal) => goal.value === data.goal) ? (data.goal as Goal) : 'maintain';
    const [selectedGoal, setSelectedGoal] = useState<Goal>(initialGoal);
    const [selectedId, setSelectedId] = useState<string>(
        GOALS.find((goal) => goal.value === initialGoal)?.id || 'maintain',
    );

    const { preview: nutritionPreview } = useOnboardingNutritionPreview(data, {
        goal: selectedGoal,
    });

    const handleNext = () => {
        saveGoal(selectedGoal);
        router.push('/onboarding/activity-level');
    };

    useEffect(() => {
        setCurrentStep(3);
    }, [setCurrentStep]);

    return (
        <OnboardingStepScreen
            stepLabel="Step 3 of 6"
            currentStep={3}
            totalSteps={6}
            title="What is your main goal?"
            description="Goal changes your calorie multipliers and protein targets immediately."
            actionLabel="Continue"
            onActionPress={handleNext}
            onBackPress={() => router.back()}
        >
            <View className="gap-4">
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
                            activeOpacity={0.7}
                        >
                            <Card
                                className={cn(
                                    'overflow-hidden border-2 shadow-sm transition-colors',
                                    isSelected
                                        ? 'border-primary bg-primary/10 shadow-primary/10'
                                        : 'border-border/50 bg-card/80 shadow-black/5',
                                )}
                            >
                                <CardContent className="flex-row items-center p-4">
                                    <View className={cn('mr-4 rounded-xl p-3', goal.bgClass)}>
                                        <Icon
                                            size={24}
                                            className={goal.colorClass}
                                            strokeWidth={isSelected ? 2.5 : 2}
                                        />
                                    </View>

                                    <View className="flex-1">
                                        <Subheading
                                            className={cn(
                                                'text-lg font-bold',
                                                isSelected ? 'text-primary' : 'text-foreground',
                                            )}
                                        >
                                            {goal.label}
                                        </Subheading>
                                        <Body className="mt-0.5 text-sm text-muted-foreground">{goal.description}</Body>
                                    </View>

                                    {isSelected && (
                                        <View className="h-7 w-7 items-center justify-center rounded-full bg-primary shadow-sm shadow-primary/30">
                                            <Trophy size={14} className="text-primary-foreground" strokeWidth={2.5} />
                                        </View>
                                    )}
                                </CardContent>
                            </Card>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Card className="mt-8 border-border/50 bg-card/80 shadow-sm shadow-black/5">
                <CardContent className="p-5">
                    <View className="mb-4 flex-row items-center justify-between">
                        <Subheading className="text-base font-bold">Live Equation Preview</Subheading>
                        <View className="rounded bg-primary/20 px-2 py-1">
                            <Body className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                Updates Live
                            </Body>
                        </View>
                    </View>
                    <View className="flex-row gap-3">
                        <View className="flex-1 items-center rounded-xl border border-border/30 bg-background/50 p-3">
                            <Body className="mb-1 text-xs text-muted-foreground">BMR</Body>
                            <Subheading className="text-base font-bold">
                                {nutritionPreview.bmr} <Body className="text-xs font-normal">kcal</Body>
                            </Subheading>
                        </View>
                        <View className="flex-1 items-center rounded-xl border border-border/30 bg-background/50 p-3">
                            <Body className="mb-1 text-xs text-muted-foreground">TDEE</Body>
                            <Subheading className="text-base font-bold">
                                {nutritionPreview.tdee} <Body className="text-xs font-normal">kcal</Body>
                            </Subheading>
                        </View>
                        <View className="flex-1 items-center rounded-xl border border-primary/20 bg-primary/10 p-3">
                            <Body className="mb-1 text-xs font-medium text-primary/80">Calories</Body>
                            <Subheading className="text-base font-bold text-primary">
                                {nutritionPreview.calorieTarget}
                            </Subheading>
                        </View>
                    </View>
                    {selectedGoal === 'general_health' && (
                        <Body className="mt-4 text-xs text-muted-foreground">
                            General health keeps calories near maintenance and nudges macros toward a more fiber-forward
                            balance.
                        </Body>
                    )}
                </CardContent>
            </Card>
        </OnboardingStepScreen>
    );
}
