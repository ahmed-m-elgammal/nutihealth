import React, { useState } from 'react';
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
    const { data, saveActivityLevel } = useOnboarding();
    const [selectedLevel, setSelectedLevel] = useState<ActivityLevel>(
        (data.activityLevel as ActivityLevel) || 'moderate'
    );

    const { preview: nutritionPreview } = useOnboardingNutritionPreview(data, {
        activityLevel: selectedLevel,
    });

    const handleNext = () => {
        saveActivityLevel(selectedLevel);
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
            <View className="gap-3">
                {ACTIVITY_LEVELS.map((level) => {
                    const isSelected = selectedLevel === level.id;
                    const Icon = level.icon;

                    return (
                        <TouchableOpacity
                            key={level.id}
                            onPress={() => setSelectedLevel(level.id)}
                            activeOpacity={0.7}
                        >
                            <Card
                                className={cn(
                                    'border-2 overflow-hidden shadow-sm transition-colors',
                                    isSelected
                                        ? 'border-primary bg-primary/10 shadow-primary/10'
                                        : 'border-border/50 bg-card/80 shadow-black/5'
                                )}
                            >
                                <CardContent className="flex-row items-center p-4">
                                    <View
                                        className={cn(
                                            'mr-4 rounded-xl p-3',
                                            isSelected ? 'bg-primary/20' : 'bg-muted'
                                        )}
                                    >
                                        <Icon
                                            size={22}
                                            strokeWidth={isSelected ? 2.5 : 2}
                                            className={cn(
                                                isSelected ? 'text-primary' : 'text-muted-foreground'
                                            )}
                                        />
                                    </View>

                                    <View className="flex-1">
                                        <Subheading
                                            className={cn(
                                                'text-lg font-bold',
                                                isSelected ? 'text-primary' : 'text-foreground'
                                            )}
                                        >
                                            {level.label}
                                        </Subheading>
                                        <Body className="text-sm text-muted-foreground mt-0.5">{level.description}</Body>
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
                    <View className="flex-row items-center justify-between mb-4">
                        <Subheading className="text-base font-bold">Live Equation Preview</Subheading>
                        <View className="bg-primary/20 px-2 py-1 rounded">
                            <Body className="text-[10px] font-bold text-primary uppercase tracking-wider">Updates Live</Body>
                        </View>
                    </View>
                    <View className="flex-row gap-3">
                        <View className="flex-1 rounded-xl bg-background/50 border border-border/30 p-3 items-center">
                            <Body className="text-xs text-muted-foreground mb-1">TDEE</Body>
                            <Subheading className="text-base font-bold">{nutritionPreview.tdee} <Body className="text-xs font-normal">kcal</Body></Subheading>
                        </View>
                        <View className="flex-1 rounded-xl bg-background/50 border border-border/30 p-3 items-center">
                            <Body className="text-xs text-muted-foreground mb-1">Hydration</Body>
                            <Subheading className="text-base font-bold">{nutritionPreview.hydration.totalHydrationMl} <Body className="text-xs font-normal">ml</Body></Subheading>
                        </View>
                        <View className="flex-[1.2] rounded-xl bg-primary/10 border border-primary/20 p-3 items-center">
                            <Body className="text-xs text-primary/80 font-medium mb-1">Target Calories</Body>
                            <Subheading className="text-lg font-bold text-primary">{nutritionPreview.calorieTarget}</Subheading>
                        </View>
                    </View>
                </CardContent>
            </Card>
        </OnboardingStepScreen>
    );
}
