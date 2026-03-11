import React, { useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { OnboardingStepScreen } from '../../components/onboarding/OnboardingStepScreen';
import { Body, Subheading } from '../../components/ui/Typography';
import { Card, CardContent } from '../../components/ui/Card';
import { Switch } from '../../components/ui/Switch';
import { cn } from '../../utils/cn';
import { withOnboardingPreferenceDefaults } from '../../constants/onboarding';
import { useOnboardingNutritionPreview } from '../../hooks/useOnboardingNutritionPreview';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useOnboardingStore } from '../../store/onboardingStore';

const DIETARY_OPTIONS = [
    'Vegetarian',
    'Vegan',
    'Pescatarian',
    'Gluten-Free',
    'Dairy-Free',
    'Keto',
    'Paleo',
    'Halal',
    'Kosher',
    'Low-Carb',
];

const ALLERGIES = ['Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Fish', 'Shellfish'];

interface ToggleChipProps {
    label: string;
    isSelected: boolean;
    onPress: () => void;
}

interface ToggleRowProps {
    label: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}

function ToggleChip({ label, isSelected, onPress }: ToggleChipProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            className={cn(
                'mb-3 mr-3 flex-row items-center rounded-full border-2 px-4 py-2.5 shadow-sm',
                isSelected
                    ? 'border-primary bg-primary shadow-primary/20'
                    : 'border-border/50 bg-background/50 shadow-transparent',
            )}
        >
            {isSelected && <Check size={16} className="mr-2 text-primary-foreground" strokeWidth={2.5} />}
            <Body
                className={cn(
                    'text-sm font-medium',
                    isSelected ? 'font-bold text-primary-foreground' : 'text-muted-foreground',
                )}
            >
                {label}
            </Body>
        </TouchableOpacity>
    );
}

function ToggleRow({ label, description, value, onValueChange }: ToggleRowProps) {
    return (
        <View
            className={cn(
                'flex-row items-center justify-between rounded-xl border-2 px-4 py-3 shadow-sm',
                value
                    ? 'border-primary/50 bg-primary/5 shadow-primary/5'
                    : 'border-border/50 bg-background/50 shadow-transparent',
            )}
        >
            <View className="flex-1 pr-4">
                <Body className={cn('text-base font-bold', value ? 'text-primary' : 'text-foreground')}>{label}</Body>
                <Body className="mt-0.5 text-sm text-muted-foreground">{description}</Body>
            </View>
            <Switch value={value} onValueChange={onValueChange} />
        </View>
    );
}

export default function DietaryPreferencesScreen() {
    const router = useRouter();
    const setCurrentStep = useOnboardingStore((state) => state.setCurrentStep);

    useEffect(() => {
        setCurrentStep(5);
    }, [setCurrentStep]);
    const { data, savePreferences } = useOnboarding();

    const initialPrefs = useMemo(() => withOnboardingPreferenceDefaults(data.preferences), [data.preferences]);
    const [selectedDiets, setSelectedDiets] = useState<string[]>(initialPrefs.dietary_restrictions);
    const [selectedAllergies, setSelectedAllergies] = useState<string[]>(initialPrefs.allergies);
    const [isAthlete, setIsAthlete] = useState<boolean>(Boolean(initialPrefs.isAthlete));
    const [hasPCOS, setHasPCOS] = useState<boolean>(Boolean(initialPrefs.hasPCOS));
    const [hasInsulinResistance, setHasInsulinResistance] = useState<boolean>(
        Boolean(initialPrefs.hasInsulinResistance),
    );
    const [onHormonalContraception, setOnHormonalContraception] = useState<boolean>(
        Boolean(initialPrefs.onHormonalContraception),
    );
    const [isPostMenopause, setIsPostMenopause] = useState<boolean>(Boolean(initialPrefs.isPostMenopause));

    const isFemale = data.gender === 'female';
    const previewPreferenceOverrides = useMemo(
        () => ({
            ...initialPrefs,
            dietary_restrictions: selectedDiets,
            allergies: selectedAllergies,
            isAthlete,
            hasPCOS,
            hasInsulinResistance,
            onHormonalContraception,
            isPostMenopause,
        }),
        [
            hasInsulinResistance,
            hasPCOS,
            initialPrefs,
            isAthlete,
            isPostMenopause,
            onHormonalContraception,
            selectedAllergies,
            selectedDiets,
        ],
    );

    const { preview: nutritionPreview } = useOnboardingNutritionPreview(data, {
        preferences: previewPreferenceOverrides,
    });

    const toggleDiet = (diet: string) => {
        setSelectedDiets((prev) => (prev.includes(diet) ? prev.filter((item) => item !== diet) : [...prev, diet]));
    };

    const toggleAllergy = (allergy: string) => {
        setSelectedAllergies((prev) =>
            prev.includes(allergy) ? prev.filter((item) => item !== allergy) : [...prev, allergy],
        );
    };

    const handleNext = () => {
        savePreferences({ ...previewPreferenceOverrides });
        router.push('/onboarding/finish');
    };

    return (
        <OnboardingStepScreen
            stepLabel="Step 5 of 6"
            currentStep={5}
            totalSteps={6}
            title="Preferences and metabolic options"
            description="Optional inputs here can adjust macro rules and calorie floors in your formulas."
            actionLabel="Review Plan"
            onActionPress={handleNext}
            onBackPress={() => router.back()}
        >
            <Card className="border-2 border-border/50 bg-card/80 shadow-sm shadow-black/5">
                <CardContent className="p-5">
                    <Subheading className="mb-1 text-lg font-bold">Dietary Restrictions</Subheading>
                    <Body className="mb-4 text-sm text-muted-foreground">
                        Select eating styles you want us to follow.
                    </Body>
                    <View className="flex-row flex-wrap">
                        {DIETARY_OPTIONS.map((diet) => (
                            <ToggleChip
                                key={diet}
                                label={diet}
                                isSelected={selectedDiets.includes(diet)}
                                onPress={() => toggleDiet(diet)}
                            />
                        ))}
                    </View>
                </CardContent>
            </Card>

            <Card className="border-2 border-border/50 bg-card/80 shadow-sm shadow-black/5">
                <CardContent className="p-5">
                    <Subheading className="mb-1 text-lg font-bold">Allergies</Subheading>
                    <Body className="mb-4 text-sm text-muted-foreground">Mark foods you need us to avoid.</Body>
                    <View className="flex-row flex-wrap">
                        {ALLERGIES.map((allergy) => (
                            <ToggleChip
                                key={allergy}
                                label={allergy}
                                isSelected={selectedAllergies.includes(allergy)}
                                onPress={() => toggleAllergy(allergy)}
                            />
                        ))}
                    </View>
                </CardContent>
            </Card>

            <Card className="border-2 border-border/50 bg-card/80 shadow-sm shadow-black/5">
                <CardContent className="gap-3 p-5">
                    <Subheading className="mb-2 text-lg font-bold">Clinical Adjustments (Optional)</Subheading>
                    <View
                        style={{
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(251,191,36,0.4)',
                            backgroundColor: 'rgba(251,191,36,0.08)',
                            padding: 14,
                            marginBottom: 16,
                        }}
                    >
                        <Text style={{ color: '#fbbf24', fontWeight: '700', fontSize: 13 }}>Sensitive Health Data</Text>
                        <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                            The options below involve sensitive health conditions. Providing them is entirely optional
                            and only used to improve your calorie and macro calculations. This data never leaves your
                            device unless you enable cloud backup. Tap any toggle to opt in.
                        </Text>
                    </View>
                    <ToggleRow
                        label="Athlete Profile"
                        description="Enables athlete-specific TDEE logic when body-fat data qualifies."
                        value={isAthlete}
                        onValueChange={setIsAthlete}
                    />
                    <ToggleRow
                        label="Insulin Resistance"
                        description="Applies lower-carb macro bounds and protein floor rules."
                        value={hasInsulinResistance}
                        onValueChange={setHasInsulinResistance}
                    />
                    {isFemale && (
                        <>
                            <ToggleRow
                                label="PCOS"
                                description="Adjusts carb/fat distribution and protein targeting."
                                value={hasPCOS}
                                onValueChange={setHasPCOS}
                            />
                            <ToggleRow
                                label="On Hormonal Contraception"
                                description="Affects hormonal calorie floor safeguards."
                                value={onHormonalContraception}
                                onValueChange={setOnHormonalContraception}
                            />
                            <ToggleRow
                                label="Post-Menopause"
                                description="Adjusts fat-per-kg guidance in macro calculations."
                                value={isPostMenopause}
                                onValueChange={setIsPostMenopause}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            <Card className="border-2 border-border/50 bg-card/80 shadow-sm shadow-black/5">
                <CardContent className="p-5">
                    <Subheading className="mb-4 text-lg font-bold text-primary">Live Equation Preview</Subheading>
                    <View className="flex-row gap-3">
                        <View className="flex-1 rounded-xl border-2 border-border/50 bg-background/50 p-4 shadow-sm shadow-transparent">
                            <Body className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Calories
                            </Body>
                            <Subheading className="text-xl font-bold text-foreground">
                                {nutritionPreview.calorieTarget}
                            </Subheading>
                        </View>
                        <View className="flex-1 rounded-xl border-2 border-border/50 bg-background/50 p-4 shadow-sm shadow-transparent">
                            <Body className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Protein
                            </Body>
                            <Subheading className="text-xl font-bold text-emerald-500">
                                {nutritionPreview.macros.protein}g
                            </Subheading>
                        </View>
                        <View className="flex-1 rounded-xl border-2 border-border/50 bg-background/50 p-4 shadow-sm shadow-transparent">
                            <Body className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Carbs
                            </Body>
                            <Subheading className="text-xl font-bold text-orange-500">
                                {nutritionPreview.macros.carbs}g
                            </Subheading>
                        </View>
                    </View>
                </CardContent>
            </Card>
        </OnboardingStepScreen>
    );
}
