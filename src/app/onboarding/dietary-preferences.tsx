import React, { useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useOnboardingStore } from '../../store/onboardingStore';
import { ActivityLevel, calculateNutritionTargets, Goal } from '../../utils/calculations';
import { OnboardingStepScreen } from '../../components/onboarding/OnboardingStepScreen';
import { Body, Subheading } from '../../components/ui/Typography';
import { Card, CardContent } from '../../components/ui/Card';
import { Switch } from '../../components/ui/Switch';
import { cn } from '../../utils/cn';
import { DEFAULT_PROFILE_VALUES } from '../../utils/profileCompletion';

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

const ALLERGIES = [
    'Peanuts',
    'Tree Nuts',
    'Milk',
    'Eggs',
    'Wheat',
    'Soy',
    'Fish',
    'Shellfish',
];

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
                'mb-3 mr-3 flex-row items-center rounded-full border px-4 py-3',
                isSelected ? 'border-primary bg-primary' : 'border-border bg-card'
            )}
        >
            {isSelected && <Check size={16} className="mr-2 text-primary-foreground" />}
            <Body className={cn('text-sm font-medium', isSelected ? 'text-primary-foreground' : 'text-foreground')}>
                {label}
            </Body>
        </TouchableOpacity>
    );
}

function ToggleRow({ label, description, value, onValueChange }: ToggleRowProps) {
    return (
        <View className="flex-row items-center justify-between rounded-lg border border-border px-3 py-3">
            <View className="flex-1 pr-3">
                <Body className="font-medium">{label}</Body>
                <Body className="text-xs text-muted-foreground">{description}</Body>
            </View>
            <Switch value={value} onValueChange={onValueChange} />
        </View>
    );
}

export default function DietaryPreferencesScreen() {
    const router = useRouter();
    const { updateData, data } = useOnboardingStore();

    const initialPrefs = { ...DEFAULT_PREFERENCES, ...data.preferences };
    const [selectedDiets, setSelectedDiets] = useState<string[]>(initialPrefs.dietary_restrictions);
    const [selectedAllergies, setSelectedAllergies] = useState<string[]>(initialPrefs.allergies);
    const [isAthlete, setIsAthlete] = useState<boolean>(Boolean(initialPrefs.isAthlete));
    const [hasPCOS, setHasPCOS] = useState<boolean>(Boolean(initialPrefs.hasPCOS));
    const [hasInsulinResistance, setHasInsulinResistance] = useState<boolean>(Boolean(initialPrefs.hasInsulinResistance));
    const [onHormonalContraception, setOnHormonalContraception] = useState<boolean>(Boolean(initialPrefs.onHormonalContraception));
    const [isPostMenopause, setIsPostMenopause] = useState<boolean>(Boolean(initialPrefs.isPostMenopause));

    const isFemale = data.gender === 'female';
    const previewAge = data.age || DEFAULT_PROFILE_VALUES.age;
    const previewSex = data.gender || DEFAULT_PROFILE_VALUES.gender;
    const previewHeight = data.height || DEFAULT_PROFILE_VALUES.height;
    const previewWeight = data.weight || DEFAULT_PROFILE_VALUES.weight;
    const previewGoal = (data.goal as Goal) || DEFAULT_PROFILE_VALUES.goal;
    const previewActivity = (data.activityLevel as ActivityLevel) || DEFAULT_PROFILE_VALUES.activityLevel;

    const nutritionPreview = useMemo(() => (
        calculateNutritionTargets({
            age: previewAge,
            sex: previewSex,
            heightCm: previewHeight,
            weightKg: previewWeight,
            goal: previewGoal,
            activityLevel: previewActivity,
            bodyFatPercentage: initialPrefs.bodyFatPercentage,
            isAthlete,
            hasPCOS,
            hasInsulinResistance,
            onHormonalContraception,
            isPostMenopause,
        })
    ), [
        previewAge,
        previewSex,
        previewHeight,
        previewWeight,
        previewGoal,
        previewActivity,
        initialPrefs.bodyFatPercentage,
        isAthlete,
        hasPCOS,
        hasInsulinResistance,
        onHormonalContraception,
        isPostMenopause,
    ]);

    const toggleDiet = (diet: string) => {
        setSelectedDiets((prev) => (
            prev.includes(diet) ? prev.filter((item) => item !== diet) : [...prev, diet]
        ));
    };

    const toggleAllergy = (allergy: string) => {
        setSelectedAllergies((prev) => (
            prev.includes(allergy) ? prev.filter((item) => item !== allergy) : [...prev, allergy]
        ));
    };

    const handleNext = () => {
        updateData({
            preferences: {
                ...initialPrefs,
                dietary_restrictions: selectedDiets,
                allergies: selectedAllergies,
                isAthlete,
                hasPCOS,
                hasInsulinResistance,
                onHormonalContraception,
                isPostMenopause,
            },
        });
        router.push('/onboarding/finish');
    };

    return (
        <OnboardingStepScreen
            stepLabel="Step 4 of 5"
            currentStep={4}
            totalSteps={5}
            title="Preferences and metabolic options"
            description="Optional inputs here can adjust macro rules and calorie floors in your formulas."
            actionLabel="Review Plan"
            onActionPress={handleNext}
            onBackPress={() => router.back()}
        >
            <Card className="border-border bg-card">
                <CardContent className="p-4">
                    <Subheading className="mb-1 text-base">Dietary Restrictions</Subheading>
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

            <Card className="border-border bg-card">
                <CardContent className="p-4">
                    <Subheading className="mb-1 text-base">Allergies</Subheading>
                    <Body className="mb-4 text-sm text-muted-foreground">
                        Mark foods you need us to avoid.
                    </Body>
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

            <Card className="border-border bg-card">
                <CardContent className="gap-3 p-4">
                    <Subheading className="text-base">Clinical Adjustments (Optional)</Subheading>
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

            <Card className="border-border bg-card">
                <CardContent className="p-4">
                    <Subheading className="mb-3 text-base">Live Equation Preview</Subheading>
                    <View className="flex-row gap-3">
                        <View className="flex-1 rounded-lg bg-muted/40 p-3">
                            <Body className="text-xs text-muted-foreground">Calories</Body>
                            <Subheading className="text-base">{nutritionPreview.calorieTarget}</Subheading>
                        </View>
                        <View className="flex-1 rounded-lg bg-muted/40 p-3">
                            <Body className="text-xs text-muted-foreground">Protein</Body>
                            <Subheading className="text-base">{nutritionPreview.macros.protein}g</Subheading>
                        </View>
                        <View className="flex-1 rounded-lg bg-muted/40 p-3">
                            <Body className="text-xs text-muted-foreground">Carbs</Body>
                            <Subheading className="text-base">{nutritionPreview.macros.carbs}g</Subheading>
                        </View>
                    </View>
                </CardContent>
            </Card>
        </OnboardingStepScreen>
    );
}
