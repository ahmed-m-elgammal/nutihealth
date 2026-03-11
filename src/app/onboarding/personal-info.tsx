import React, { useMemo, useState } from 'react';
import { Alert, TouchableOpacity, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ruler, User, UserRound, Weight, Target } from 'lucide-react-native';
import { OnboardingStepScreen } from '../../components/onboarding/OnboardingStepScreen';
import { Body, Subheading } from '../../components/ui/Typography';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { useOnboarding } from '../../hooks/useOnboarding';

type SexOption = 'male' | 'female' | 'other';

const SEX_OPTIONS: { value: SexOption; label: string }[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

export default function PersonalInfoScreen() {
    const router = useRouter();
    const { personalInfoDefaults, savePersonalInfo, validatePersonalInfoDraft } = useOnboarding();

    const [name, setName] = useState(personalInfoDefaults.name);
    const [ageInput, setAgeInput] = useState(personalInfoDefaults.ageInput);
    const [heightInput, setHeightInput] = useState(personalInfoDefaults.heightInput);
    const [weightInput, setWeightInput] = useState(personalInfoDefaults.weightInput);
    const [bodyFatInput, setBodyFatInput] = useState(personalInfoDefaults.bodyFatInput || '');
    const [sex, setSex] = useState<SexOption>(personalInfoDefaults.sex);

    const isFormValid = useMemo(
        () =>
            validatePersonalInfoDraft({
                name,
                ageInput,
                heightInput,
                weightInput,
                bodyFatInput,
                sex,
            }).valid,
        [ageInput, bodyFatInput, heightInput, name, sex, validatePersonalInfoDraft, weightInput],
    );

    const handleNext = () => {
        const result = savePersonalInfo({
            name,
            ageInput,
            heightInput,
            weightInput,
            bodyFatInput,
            sex,
        });

        if (!result.valid) {
            Alert.alert('Invalid Inputs', result.message || 'Please review your entries and try again.');
            return;
        }

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
            <View className="flex-1">
                <Card className="border-border/50 bg-card/80 overflow-hidden shadow-sm shadow-black/5">
                    <CardContent className="gap-5 p-5">
                        <View>
                            <Label className="mb-2 text-muted-foreground">Name</Label>
                            <Input
                                placeholder="Enter your name"
                                value={name}
                                onChangeText={setName}
                                icon={<User size={18} className="text-muted-foreground" />}
                                returnKeyType="done"
                                className="h-12 border-border/50 bg-background/50 focus:border-primary"
                            />
                        </View>

                        <View>
                            <Label className="mb-2 text-muted-foreground">Biological Sex</Label>
                            <View className="flex-row gap-3">
                                {SEX_OPTIONS.map((option) => {
                                    const isSelected = sex === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            onPress={() => setSex(option.value)}
                                            activeOpacity={0.7}
                                            className={cn(
                                                'flex-1 items-center justify-center rounded-xl border-2 py-4 shadow-sm',
                                                isSelected
                                                    ? 'border-primary bg-primary/10 shadow-primary/10'
                                                    : 'border-border/50 bg-background/50 shadow-transparent'
                                            )}
                                        >
                                            <Subheading
                                                className={cn(
                                                    'text-base',
                                                    isSelected ? 'text-primary font-bold' : 'text-muted-foreground font-medium'
                                                )}
                                            >
                                                {option.label}
                                            </Subheading>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="flex-1">
                                <Label className="mb-2 text-muted-foreground">Age (years)</Label>
                                <Input
                                    placeholder="25"
                                    value={ageInput}
                                    onChangeText={setAgeInput}
                                    keyboardType="number-pad"
                                    icon={<UserRound size={18} className="text-muted-foreground" />}
                                    className="h-12 border-border/50 bg-background/50 focus:border-primary"
                                />
                            </View>
                            <View className="flex-1">
                                <Label className="mb-2 text-muted-foreground">Body Fat % (opt)</Label>
                                <Input
                                    placeholder="e.g. 22"
                                    value={bodyFatInput}
                                    onChangeText={setBodyFatInput}
                                    keyboardType="decimal-pad"
                                    className="h-12 border-border/50 bg-background/50 focus:border-primary"
                                />
                            </View>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="flex-1">
                                <Label className="mb-2 text-muted-foreground">Height (cm)</Label>
                                <Input
                                    placeholder="170"
                                    value={heightInput}
                                    onChangeText={setHeightInput}
                                    keyboardType="decimal-pad"
                                    icon={<Ruler size={18} className="text-muted-foreground" />}
                                    className="h-12 border-border/50 bg-background/50 focus:border-primary"
                                />
                            </View>
                            <View className="flex-1">
                                <Label className="mb-2 text-muted-foreground">Weight (kg)</Label>
                                <Input
                                    placeholder="70"
                                    value={weightInput}
                                    onChangeText={setWeightInput}
                                    keyboardType="decimal-pad"
                                    icon={<Weight size={18} className="text-muted-foreground" />}
                                    className="h-12 border-border/50 bg-background/50 focus:border-primary"
                                />
                            </View>
                        </View>
                    </CardContent>
                </Card>

                <View className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex-row items-start gap-3">
                    <View className="bg-primary/10 rounded-full p-1.5 mt-0.5">
                        <Target size={14} className="text-primary" />
                    </View>
                    <View className="flex-1">
                        <Body className="text-sm font-medium text-foreground">
                            These inputs drive your equation-based plan.
                        </Body>
                        <Body className="text-xs text-muted-foreground mt-1">
                            You can update them anytime in Profile.
                        </Body>
                    </View>
                </View>
            </View>
        </OnboardingStepScreen>
    );
}
