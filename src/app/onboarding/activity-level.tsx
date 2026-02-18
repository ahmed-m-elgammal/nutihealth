import React, { useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Armchair, Briefcase, Dumbbell, Pizza, Trophy } from 'lucide-react-native';
import { useOnboardingStore } from '../../store/onboardingStore';
import { ActivityLevel, calculateNutritionTargets, Goal } from '../../utils/calculations';
import { OnboardingStepScreen } from '../../components/onboarding/OnboardingStepScreen';
import { Body, Subheading } from '../../components/ui/Typography';
import { Card, CardContent } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { DEFAULT_PROFILE_VALUES } from '../../utils/profileCompletion';

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
        icon: Trophy,
    },
];

export default function ActivityLevelScreen() {
    const router = useRouter();
    const { updateData, data } = useOnboardingStore();
    const [selectedLevel, setSelectedLevel] = useState<ActivityLevel>(
        (data.activityLevel as ActivityLevel) || 'moderate'
    );

    const previewAge = data.age || DEFAULT_PROFILE_VALUES.age;
    const previewSex = data.gender || DEFAULT_PROFILE_VALUES.gender;
    const previewHeight = data.height || DEFAULT_PROFILE_VALUES.height;
    const previewWeight = data.weight || DEFAULT_PROFILE_VALUES.weight;
    const previewGoal = (data.goal as Goal) || DEFAULT_PROFILE_VALUES.goal;

    const nutritionPreview = useMemo(() => (
        calculateNutritionTargets({
            age: previewAge,
            sex: previewSex,
            heightCm: previewHeight,
            weightKg: previewWeight,
            goal: previewGoal,
            activityLevel: selectedLevel,
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
        previewGoal,
        selectedLevel,
        data.preferences,
    ]);

    const handleNext = () => {
        updateData({ activityLevel: selectedLevel });
        router.push('/onboarding/dietary-preferences');
    };

    return (
        <OnboardingStepScreen
            stepLabel="Step 3 of 5"
            currentStep={3}
            totalSteps={5}
            title="How active are you?"
            description="Activity changes TDEE and hydration directly in your formula results."
            actionLabel="Continue"
            onActionPress={handleNext}
            onBackPress={() => router.back()}
        >
            {ACTIVITY_LEVELS.map((level) => {
                const isSelected = selectedLevel === level.id;
                const Icon = level.icon;

                return (
                    <TouchableOpacity
                        key={level.id}
                        onPress={() => setSelectedLevel(level.id)}
                        activeOpacity={0.8}
                    >
                        <Card
                            className={cn(
                                'border-2 border-border bg-card',
                                isSelected && 'border-primary bg-primary/5'
                            )}
                        >
                            <CardContent className="flex-row items-center p-4">
                                <View
                                    className={cn(
                                        'mr-4 rounded-full p-3',
                                        isSelected ? 'bg-primary/15' : 'bg-muted'
                                    )}
                                >
                                    <Icon
                                        size={22}
                                        className={cn(
                                            isSelected ? 'text-primary' : 'text-muted-foreground'
                                        )}
                                    />
                                </View>

                                <View className="flex-1">
                                    <Subheading className={cn('text-base', isSelected && 'text-primary')}>
                                        {level.label}
                                    </Subheading>
                                    <Body className="text-sm text-muted-foreground">{level.description}</Body>
                                </View>
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
                            <Body className="text-xs text-muted-foreground">TDEE</Body>
                            <Subheading className="text-base">{nutritionPreview.tdee} kcal</Subheading>
                        </View>
                        <View className="flex-1 rounded-lg bg-muted/40 p-3">
                            <Body className="text-xs text-muted-foreground">Calories</Body>
                            <Subheading className="text-base">{nutritionPreview.calorieTarget}</Subheading>
                        </View>
                        <View className="flex-1 rounded-lg bg-muted/40 p-3">
                            <Body className="text-xs text-muted-foreground">Hydration</Body>
                            <Subheading className="text-base">{nutritionPreview.hydration.totalHydrationMl} ml</Subheading>
                        </View>
                    </View>
                </CardContent>
            </Card>
        </OnboardingStepScreen>
    );
}
