import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Armchair, Briefcase, Dumbbell, Pizza, Trophy, Zap } from 'lucide-react-native';
import { ActivityLevel } from '../../utils/calculations';
import { OnboardingStepScreen } from '../../components/onboarding/OnboardingStepScreen';
import { Body, Subheading } from '../../components/ui/Typography';
import { Card, CardContent } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { useOnboardingNutritionPreview } from '../../hooks/useOnboardingNutritionPreview';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useOnboardingStore } from '../../store/onboardingStore';

const ACTIVITY_LEVELS: {
    id: ActivityLevel;
    label: string;
    description: string;
    icon: any;
}[] = [
    {
        id: 'sedentary',
        label: 'Sedentary',
        description: 'Little to no exercise, mostly desk-based days.',
        icon: Armchair,
    },
    {
        id: 'light',
        label: 'Lightly Active',
        description: 'Light training or walking 1-3 days per week.',
        icon: Pizza,
    },
    {
        id: 'moderate',
        label: 'Moderately Active',
        description: 'Consistent exercise around 3-5 days weekly.',
        icon: Briefcase,
    },
    {
        id: 'very_active',
        label: 'Very Active',
        description: 'Hard sessions most days of the week.',
        icon: Dumbbell,
    },
    {
        id: 'athlete',
        label: 'Athlete',
        description: 'Intense training volume or physically demanding job.',
        icon: Zap,
    },
];

export default function ActivityLevelScreen() {
    const router = useRouter();
    const setCurrentStep = useOnboardingStore((state) => state.setCurrentStep);
    const { data, saveActivityLevel } = useOnboarding();
    const [selectedLevel, setSelectedLevel] = useState<ActivityLevel>(
        (data.activityLevel as ActivityLevel) || 'moderate',
    );

    const { preview: nutritionPreview } = useOnboardingNutritionPreview(data, {
        activityLevel: selectedLevel,
    });

    const handleNext = () => {
        saveActivityLevel(selectedLevel);
        router.push('/onboarding/dietary-preferences');
    };

    useEffect(() => {
        setCurrentStep(4);
    }, [setCurrentStep]);

    return (
        <OnboardingStepScreen
            stepLabel="Step 4 of 6"
            currentStep={4}
            totalSteps={6}
            title="How active are you?"
            description="Activity changes TDEE and hydration directly in your formula results."
            actionLabel="Continue"
            onActionPress={handleNext}
            onBackPress={() => router.back()}
        >
            <View className="gap-3">
                {ACTIVITY_LEVELS.map((level) => {
                    const isSelected = selectedLevel === level.id;
                    const Icon = level.icon;

                    return (
                        <TouchableOpacity key={level.id} onPress={() => setSelectedLevel(level.id)} activeOpacity={0.7}>
                            <Card
                                className={cn(
                                    'overflow-hidden border-2 shadow-sm transition-colors',
                                    isSelected
                                        ? 'border-primary bg-primary/10 shadow-primary/10'
                                        : 'border-border/50 bg-card/80 shadow-black/5',
                                )}
                            >
                                <CardContent className="flex-row items-center p-4">
                                    <View
                                        className={cn('mr-4 rounded-xl p-3', isSelected ? 'bg-primary/20' : 'bg-muted')}
                                    >
                                        <Icon
                                            size={22}
                                            strokeWidth={isSelected ? 2.5 : 2}
                                            className={cn(isSelected ? 'text-primary' : 'text-muted-foreground')}
                                        />
                                    </View>

                                    <View className="flex-1">
                                        <Subheading
                                            className={cn(
                                                'text-lg font-bold',
                                                isSelected ? 'text-primary' : 'text-foreground',
                                            )}
                                        >
                                            {level.label}
                                        </Subheading>
                                        <Body className="mt-0.5 text-sm text-muted-foreground">
                                            {level.description}
                                        </Body>
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
                            <Body className="mb-1 text-xs text-muted-foreground">TDEE</Body>
                            <Subheading className="text-base font-bold">
                                {nutritionPreview.tdee} <Body className="text-xs font-normal">kcal</Body>
                            </Subheading>
                        </View>
                        <View className="flex-1 items-center rounded-xl border border-border/30 bg-background/50 p-3">
                            <Body className="mb-1 text-xs text-muted-foreground">Hydration</Body>
                            <Subheading className="text-base font-bold">
                                {nutritionPreview.hydration.totalHydrationMl}{' '}
                                <Body className="text-xs font-normal">ml</Body>
                            </Subheading>
                        </View>
                        <View className="flex-[1.2] items-center rounded-xl border border-primary/20 bg-primary/10 p-3">
                            <Body className="mb-1 text-xs font-medium text-primary/80">Target Calories</Body>
                            <Subheading className="text-lg font-bold text-primary">
                                {nutritionPreview.calorieTarget}
                            </Subheading>
                        </View>
                    </View>
                </CardContent>
            </Card>
        </OnboardingStepScreen>
    );
}
