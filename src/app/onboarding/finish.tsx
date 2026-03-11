import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Droplet, Dumbbell, Flame, Gauge } from 'lucide-react-native';
import { OnboardingStepScreen } from '../../components/onboarding/OnboardingStepScreen';
import { triggerHaptic } from '../../utils/haptics';
import { Body, Heading, Subheading } from '../../components/ui/Typography';
import { Card, CardContent } from '../../components/ui/Card';
import { withOnboardingPreferenceDefaults } from '../../constants/onboarding';
import { useOnboardingNutritionPreview } from '../../hooks/useOnboardingNutritionPreview';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useOnboardingStore } from '../../store/onboardingStore';
import { usePostHog } from 'posthog-react-native';

export default function FinishScreen() {
    const router = useRouter();
    const setCurrentStep = useOnboardingStore((state) => state.setCurrentStep);
    const { data, submitOnboarding } = useOnboarding();
    const posthog = usePostHog();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const preferences = useMemo(() => withOnboardingPreferenceDefaults(data.preferences), [data.preferences]);

    const { preview: nutritionPreview, inputs } = useOnboardingNutritionPreview(data, {
        preferences,
    });

    const handleFinish = async () => {
        setIsSubmitting(true);
        try {
            triggerHaptic('success').catch(() => undefined);
            await submitOnboarding();
            posthog.capture('onboarding_completed', {
                goal: inputs.goal,
                activity_level: inputs.activityLevel,
                calorie_target: nutritionPreview.calorieTarget,
                bmi: nutritionPreview.bmi,
            });
            router.replace('/(tabs)');
        } catch (error) {
            Alert.alert('Error', (error as Error).message);
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        setCurrentStep(6);
    }, [setCurrentStep]);

    return (
        <OnboardingStepScreen
            stepLabel="Step 6 of 6"
            currentStep={6}
            totalSteps={6}
            title="Your formula-based plan is ready"
            description="These targets are calculated from your exact onboarding inputs and selected clinical options."
            actionLabel="Start Journey"
            onActionPress={handleFinish}
            onBackPress={() => router.back()}
            actionLoading={isSubmitting}
            contentClassName="pb-4"
        >
            <View className="items-center py-6">
                <View className="mb-4 rounded-full border border-primary/30 bg-primary/20 p-5 shadow-sm shadow-primary/20">
                    <Check size={40} className="text-primary" strokeWidth={2.5} />
                </View>
                <Heading className="text-center font-display text-3xl text-primary">Plan Generated</Heading>
            </View>

            <Card className="border-2 border-border/50 bg-card/80 shadow-sm shadow-black/5">
                <CardContent className="p-6">
                    <View className="mb-4 flex-row items-center justify-between">
                        <Subheading className="text-lg font-bold">Daily Calories</Subheading>
                        <Flame size={24} className="text-orange-500" strokeWidth={2.5} />
                    </View>

                    <Heading className="font-display text-4xl tracking-tight text-foreground">
                        {nutritionPreview.calorieTarget}
                    </Heading>
                    <Body className="mt-1 text-base font-medium text-muted-foreground">kcal / day</Body>

                    <View className="mt-6 flex-row gap-3 border-t-2 border-border/50 pt-5">
                        <View className="flex-1 items-center rounded-xl border-2 border-border/50 bg-background/50 p-3">
                            <Subheading className="text-lg font-bold text-emerald-500">
                                {nutritionPreview.macros.protein}g
                            </Subheading>
                            <Body className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Protein
                            </Body>
                        </View>
                        <View className="flex-1 items-center rounded-xl border-2 border-border/50 bg-background/50 p-3">
                            <Subheading className="text-lg font-bold text-orange-500">
                                {nutritionPreview.macros.carbs}g
                            </Subheading>
                            <Body className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Carbs
                            </Body>
                        </View>
                        <View className="flex-1 items-center rounded-xl border-2 border-border/50 bg-background/50 p-3">
                            <Subheading className="text-lg font-bold text-purple-500">
                                {nutritionPreview.macros.fats}g
                            </Subheading>
                            <Body className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Fats
                            </Body>
                        </View>
                    </View>
                </CardContent>
            </Card>

            <View className="flex-row gap-3">
                <Card className="flex-1 border-2 border-border/50 bg-card/80 shadow-sm shadow-black/5">
                    <CardContent className="items-center p-4">
                        <View className="mb-3 rounded-full bg-indigo-500/10 p-2">
                            <Gauge size={24} className="text-indigo-500" strokeWidth={2.5} />
                        </View>
                        <Subheading className="text-base font-bold text-foreground">
                            {nutritionPreview.bmr} / {nutritionPreview.tdee}
                        </Subheading>
                        <Body className="mt-1 text-center text-xs font-medium text-muted-foreground">BMR / TDEE</Body>
                    </CardContent>
                </Card>

                <Card className="flex-1 border-2 border-border/50 bg-card/80 shadow-sm shadow-black/5">
                    <CardContent className="items-center p-4">
                        <View className="mb-3 rounded-full bg-blue-500/10 p-2">
                            <Droplet size={24} className="text-blue-500" strokeWidth={2.5} />
                        </View>
                        <Subheading className="text-base font-bold text-foreground">
                            {nutritionPreview.hydration.totalHydrationMl} ml
                        </Subheading>
                        <Body className="mt-1 text-center text-xs font-medium text-muted-foreground">Water Goal</Body>
                    </CardContent>
                </Card>

                <Card className="flex-1 border-2 border-border/50 bg-card/80 shadow-sm shadow-black/5">
                    <CardContent className="items-center p-4">
                        <View className="mb-3 rounded-full bg-emerald-500/10 p-2">
                            <Dumbbell size={24} className="text-emerald-500" strokeWidth={2.5} />
                        </View>
                        <Subheading className="text-base font-bold text-foreground">{nutritionPreview.bmi}</Subheading>
                        <Body className="mt-1 text-center text-xs font-medium text-muted-foreground">BMI</Body>
                    </CardContent>
                </Card>
            </View>

            <Card className="border-2 border-border/50 bg-card/80 shadow-sm shadow-black/5">
                <CardContent className="p-5">
                    <Subheading className="mb-2 text-base font-bold text-foreground">Inputs Used</Subheading>
                    <Body className="text-sm text-muted-foreground">
                        Age {inputs.age} • Sex {inputs.sex} • Height {inputs.heightCm} cm • Weight {inputs.weightKg} kg
                        • Goal {inputs.goal} • Activity {inputs.activityLevel}
                    </Body>
                </CardContent>
            </Card>
        </OnboardingStepScreen>
    );
}
