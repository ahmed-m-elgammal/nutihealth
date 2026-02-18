import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Droplet, Dumbbell, Flame, Gauge } from 'lucide-react-native';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useUserStore, UserData } from '../../store/userStore';
import { ActivityLevel, calculateNutritionTargets, Goal } from '../../utils/calculations';
import { DEFAULT_PROFILE_VALUES } from '../../utils/profileCompletion';
import { OnboardingStepScreen } from '../../components/onboarding/OnboardingStepScreen';
import { Body, Heading, Subheading } from '../../components/ui/Typography';
import { Card, CardContent } from '../../components/ui/Card';

const DEFAULT_PREFERENCES = {
    allergies: [],
    dietary_restrictions: [],
    theme: 'auto' as const,
    notifications_enabled: true,
    language: 'en',
    needsBodyMetrics: false,
    bodyFatPercentage: undefined,
    hasPCOS: false,
    hasInsulinResistance: false,
    onHormonalContraception: false,
    isPostMenopause: false,
    isAthlete: false,
    week1WeightKg: undefined,
    compliancePercentage: undefined,
};

export default function FinishScreen() {
    const router = useRouter();
    const { data, reset } = useOnboardingStore();
    const { createUser, completeOnboarding } = useUserStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const normalizedGoal: Goal = data.goal || 'maintain';
    const previewWeight = data.weight || DEFAULT_PROFILE_VALUES.weight;
    const previewHeight = data.height || DEFAULT_PROFILE_VALUES.height;
    const previewAge = data.age || DEFAULT_PROFILE_VALUES.age;
    const previewGender = data.gender || DEFAULT_PROFILE_VALUES.gender;
    const previewActivityLevel = (data.activityLevel as ActivityLevel) || DEFAULT_PROFILE_VALUES.activityLevel;
    const preferences = { ...DEFAULT_PREFERENCES, ...data.preferences };

    const nutritionPreview = useMemo(() => (
        calculateNutritionTargets({
            age: previewAge,
            sex: previewGender,
            heightCm: previewHeight,
            weightKg: previewWeight,
            goal: normalizedGoal,
            activityLevel: previewActivityLevel,
            bodyFatPercentage: preferences.bodyFatPercentage,
            isAthlete: preferences.isAthlete,
            hasPCOS: preferences.hasPCOS,
            hasInsulinResistance: preferences.hasInsulinResistance,
            onHormonalContraception: preferences.onHormonalContraception,
            isPostMenopause: preferences.isPostMenopause,
            week1WeightKg: preferences.week1WeightKg,
            currentWeightKg: previewWeight,
            compliancePercentage: preferences.compliancePercentage,
        })
    ), [
        previewAge,
        previewGender,
        previewHeight,
        previewWeight,
        normalizedGoal,
        previewActivityLevel,
        preferences,
    ]);

    const handleFinish = async () => {
        setIsSubmitting(true);
        try {
            if (
                !data.name ||
                !data.age ||
                !data.gender ||
                !data.height ||
                !data.weight ||
                !data.goal ||
                !data.activityLevel
            ) {
                throw new Error('Missing required profile inputs. Please complete previous steps.');
            }

            const finalUserData: UserData = {
                name: data.name,
                age: data.age,
                gender: data.gender,
                height: data.height,
                weight: data.weight,
                goal: data.goal,
                activityLevel: data.activityLevel as ActivityLevel,
                preferences,
            };

            await createUser(finalUserData);
            await completeOnboarding();
            reset();
            router.replace('/(tabs)');
        } catch (error) {
            Alert.alert('Error', (error as Error).message);
            setIsSubmitting(false);
        }
    };

    return (
        <OnboardingStepScreen
            stepLabel="Step 5 of 5"
            currentStep={5}
            totalSteps={5}
            title="Your formula-based plan is ready"
            description="These targets are calculated from your exact onboarding inputs and selected clinical options."
            actionLabel="Start Journey"
            onActionPress={handleFinish}
            onBackPress={() => router.back()}
            actionLoading={isSubmitting}
            contentClassName="pb-4"
        >
            <View className="items-center py-2">
                <View className="mb-3 rounded-full bg-primary/15 p-3">
                    <Check size={32} className="text-primary" />
                </View>
                <Heading className="text-center text-xl">Plan Generated</Heading>
            </View>

            <Card className="border-border bg-card">
                <CardContent className="p-5">
                    <View className="mb-3 flex-row items-center justify-between">
                        <Subheading className="text-base">Daily Calories</Subheading>
                        <Flame size={20} className="text-orange-500" />
                    </View>

                    <Heading className="text-3xl">{nutritionPreview.calorieTarget}</Heading>
                    <Body className="text-sm text-muted-foreground">kcal / day</Body>

                    <View className="mt-5 flex-row gap-3 border-t border-border pt-4">
                        <View className="flex-1">
                            <Subheading className="text-base text-blue-500">{nutritionPreview.macros.protein}g</Subheading>
                            <Body className="text-xs text-muted-foreground">Protein</Body>
                        </View>
                        <View className="flex-1">
                            <Subheading className="text-base text-orange-500">{nutritionPreview.macros.carbs}g</Subheading>
                            <Body className="text-xs text-muted-foreground">Carbs</Body>
                        </View>
                        <View className="flex-1">
                            <Subheading className="text-base text-purple-500">{nutritionPreview.macros.fats}g</Subheading>
                            <Body className="text-xs text-muted-foreground">Fats</Body>
                        </View>
                    </View>
                </CardContent>
            </Card>

            <View className="flex-row gap-3">
                <Card className="flex-1 border-border bg-card">
                    <CardContent className="p-4">
                        <Gauge size={22} className="mb-2 text-indigo-500" />
                        <Subheading className="text-base">{nutritionPreview.bmr} / {nutritionPreview.tdee}</Subheading>
                        <Body className="text-xs text-muted-foreground">BMR / TDEE</Body>
                    </CardContent>
                </Card>

                <Card className="flex-1 border-border bg-card">
                    <CardContent className="p-4">
                        <Droplet size={22} className="mb-2 text-blue-500" />
                        <Subheading className="text-base">{nutritionPreview.hydration.totalHydrationMl} ml</Subheading>
                        <Body className="text-xs text-muted-foreground">Water Goal</Body>
                    </CardContent>
                </Card>

                <Card className="flex-1 border-border bg-card">
                    <CardContent className="p-4">
                        <Dumbbell size={22} className="mb-2 text-emerald-500" />
                        <Subheading className="text-base">{nutritionPreview.bmi}</Subheading>
                        <Body className="text-xs text-muted-foreground">BMI</Body>
                    </CardContent>
                </Card>
            </View>

            <Card className="border-border bg-card">
                <CardContent className="p-4">
                    <Subheading className="mb-2 text-base">Inputs Used</Subheading>
                    <Body className="text-sm text-muted-foreground">
                        Age {previewAge} • Sex {previewGender} • Height {previewHeight} cm • Weight {previewWeight} kg • Goal {normalizedGoal} • Activity {previewActivityLevel}
                    </Body>
                </CardContent>
            </Card>
        </OnboardingStepScreen>
    );
}
