import React, { useMemo, useState } from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ruler, User, UserRound, Weight } from 'lucide-react-native';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingStepScreen } from '../../components/onboarding/OnboardingStepScreen';
import { Body } from '../../components/ui/Typography';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { DEFAULT_PROFILE_VALUES } from '../../utils/profileCompletion';

type SexOption = 'male' | 'female' | 'other';

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

const SEX_OPTIONS: { value: SexOption; label: string }[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

export default function PersonalInfoScreen() {
    const router = useRouter();
    const { updateData, data } = useOnboardingStore();

    const [name, setName] = useState(data.name || '');
    const [ageInput, setAgeInput] = useState(String(data.age || DEFAULT_PROFILE_VALUES.age));
    const [heightInput, setHeightInput] = useState(String(data.height || DEFAULT_PROFILE_VALUES.height));
    const [weightInput, setWeightInput] = useState(String(data.weight || DEFAULT_PROFILE_VALUES.weight));
    const [bodyFatInput, setBodyFatInput] = useState(
        typeof data.preferences?.bodyFatPercentage === 'number'
            ? String(data.preferences.bodyFatPercentage)
            : ''
    );
    const [sex, setSex] = useState<SexOption>(data.gender || DEFAULT_PROFILE_VALUES.gender);

    const parsedAge = Number(ageInput);
    const parsedHeight = Number(heightInput);
    const parsedWeight = Number(weightInput);
    const parsedBodyFat = bodyFatInput.trim() ? Number(bodyFatInput) : undefined;

    const isFormValid = useMemo(() => {
        const baseValid = Boolean(
            name.trim() &&
            Number.isFinite(parsedAge) &&
            parsedAge >= 6 &&
            parsedAge <= 100 &&
            Number.isFinite(parsedHeight) &&
            parsedHeight >= 100 &&
            parsedHeight <= 250 &&
            Number.isFinite(parsedWeight) &&
            parsedWeight >= 25 &&
            parsedWeight <= 350
        );

        if (!baseValid) {
            return false;
        }

        if (parsedBodyFat === undefined) {
            return true;
        }

        return Number.isFinite(parsedBodyFat) && parsedBodyFat >= 3 && parsedBodyFat <= 60;
    }, [name, parsedAge, parsedHeight, parsedWeight, parsedBodyFat]);

    const handleNext = () => {
        if (!isFormValid) {
            Alert.alert(
                'Invalid Inputs',
                'Please enter valid age (6-100), height (100-250 cm), weight (25-350 kg), and optional body fat (3-60%).'
            );
            return;
        }

        const preferences = {
            ...DEFAULT_PREFERENCES,
            ...data.preferences,
            needsBodyMetrics: false,
            bodyFatPercentage: parsedBodyFat,
        };

        updateData({
            name: name.trim(),
            age: Math.round(parsedAge),
            gender: sex,
            height: Math.round(parsedHeight),
            weight: parseFloat(parsedWeight.toFixed(1)),
            preferences,
        });

        router.push('/onboarding/goals');
    };

    return (
        <OnboardingStepScreen
            stepLabel="Step 1 of 5"
            currentStep={1}
            totalSteps={5}
            title="Enter your body profile"
            description="These are the exact inputs used for BMR, TDEE, calories, macros, and hydration."
            actionLabel="Continue"
            onActionPress={handleNext}
            onBackPress={() => router.back()}
            actionDisabled={!isFormValid}
        >
            <Card className="border-border bg-card">
                <CardContent className="gap-4 p-4">
                    <View>
                        <Label>Name</Label>
                        <Input
                            placeholder="Enter your name"
                            value={name}
                            onChangeText={setName}
                            icon={<User size={18} className="text-muted-foreground" />}
                            returnKeyType="done"
                        />
                    </View>

                    <View>
                        <Label>Biological Sex</Label>
                        <View className="flex-row gap-2">
                            {SEX_OPTIONS.map((option) => {
                                const isSelected = sex === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => setSex(option.value)}
                                        activeOpacity={0.8}
                                        className={cn(
                                            'flex-1 rounded-lg border px-3 py-3',
                                            isSelected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                                        )}
                                    >
                                        <Body className={cn('text-center font-medium', isSelected && 'text-primary')}>
                                            {option.label}
                                        </Body>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <Label>Age (years)</Label>
                            <Input
                                placeholder="25"
                                value={ageInput}
                                onChangeText={setAgeInput}
                                keyboardType="number-pad"
                                icon={<UserRound size={18} className="text-muted-foreground" />}
                            />
                        </View>
                        <View className="flex-1">
                            <Label>Body Fat % (optional)</Label>
                            <Input
                                placeholder="e.g. 22"
                                value={bodyFatInput}
                                onChangeText={setBodyFatInput}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <Label>Height (cm)</Label>
                            <Input
                                placeholder="170"
                                value={heightInput}
                                onChangeText={setHeightInput}
                                keyboardType="decimal-pad"
                                icon={<Ruler size={18} className="text-muted-foreground" />}
                            />
                        </View>
                        <View className="flex-1">
                            <Label>Weight (kg)</Label>
                            <Input
                                placeholder="70"
                                value={weightInput}
                                onChangeText={setWeightInput}
                                keyboardType="decimal-pad"
                                icon={<Weight size={18} className="text-muted-foreground" />}
                            />
                        </View>
                    </View>
                </CardContent>
            </Card>

            <View className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800/50 dark:bg-emerald-900/20">
                <Body className="text-sm text-emerald-700 dark:text-emerald-300">
                    These inputs drive your equation-based plan. You can update them anytime in Profile.
                </Body>
            </View>
        </OnboardingStepScreen>
    );
}
