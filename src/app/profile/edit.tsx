import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { triggerHaptic } from '../../utils/haptics';
import { useUserStore } from '../../store/userStore';
import { useUIStore } from '../../store/uiStore';
import { useWaterStore } from '../../store/waterStore';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { usePostHog } from 'posthog-react-native';
import type { ActivityLevel, Goal } from '../../utils/calculations';

const goalOptions: Array<{ key: Goal; label: string; emoji: string }> = [
    { key: 'lose', label: 'Weight Loss', emoji: '🔥' },
    { key: 'maintain', label: 'Maintain', emoji: '⚖️' },
    { key: 'gain', label: 'Gain', emoji: '💪' },
    { key: 'general_health', label: 'General Health', emoji: '❤️' },
];

const activityLevelOptions: Array<{ key: ActivityLevel; label: string; description: string }> = [
    { key: 'sedentary', label: 'Sedentary', description: 'Mostly seated days' },
    { key: 'light', label: 'Light', description: 'Light activity 1-3 days/wk' },
    { key: 'moderate', label: 'Moderate', description: 'Regular activity 3-5 days/wk' },
    { key: 'very_active', label: 'Very Active', description: 'Hard training most days' },
    { key: 'athlete', label: 'Athlete', description: 'High-volume training workload' },
];

const AGE_RANGE = { min: 6, max: 100 };
const WEIGHT_RANGE = { min: 40, max: 150 };
const HEIGHT_RANGE = { min: 120, max: 220 };

const clampMetricValue = (value: number, range: { min: number; max: number }): number =>
    Math.max(range.min, Math.min(range.max, value));

const sanitizeMetricInput = (value: string): string => value.replace(/[^0-9]/g, '');

export default function EditProfileScreen() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const updateUser = useUserStore((state) => state.updateUser);
    const calculateDynamicTarget = useWaterStore((state) => state.calculateDynamicTarget);
    const showToast = useUIStore((state) => state.showToast);
    const posthog = usePostHog();

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [age, setAge] = useState(user?.age || 25);
    const [ageInput, setAgeInput] = useState(String(user?.age || 25));
    const [weight, setWeight] = useState(user?.weight || 70);
    const [height, setHeight] = useState(user?.height || 170);
    const [weightInput, setWeightInput] = useState(String(user?.weight || 70));
    const [heightInput, setHeightInput] = useState(String(user?.height || 170));
    const [goal, setGoal] = useState<Goal>((user?.goal as Goal) || 'maintain');
    const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
        (user?.activityLevel as ActivityLevel) || 'moderate',
    );

    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user) return;
        setName(user.name || '');
        setEmail(user.email || '');
        setAge(user.age || 25);
        setAgeInput(String(user.age || 25));
        setWeight(user.weight || 70);
        setHeight(user.height || 170);
        setWeightInput(String(user.weight || 70));
        setHeightInput(String(user.height || 170));
        setGoal((user.goal as Goal) || 'maintain');
        setActivityLevel((user.activityLevel as ActivityLevel) || 'moderate');
    }, [user]);

    const handleAgeInputChange = (value: string) => {
        const sanitized = sanitizeMetricInput(value);
        setAgeInput(sanitized);

        const parsed = Number.parseInt(sanitized, 10);
        if (Number.isFinite(parsed)) {
            setAge(clampMetricValue(parsed, AGE_RANGE));
        }
    };

    const handleWeightInputChange = (value: string) => {
        const sanitized = sanitizeMetricInput(value);
        setWeightInput(sanitized);

        const parsed = Number.parseInt(sanitized, 10);
        if (Number.isFinite(parsed)) {
            setWeight(clampMetricValue(parsed, WEIGHT_RANGE));
        }
    };

    const handleHeightInputChange = (value: string) => {
        const sanitized = sanitizeMetricInput(value);
        setHeightInput(sanitized);

        const parsed = Number.parseInt(sanitized, 10);
        if (Number.isFinite(parsed)) {
            setHeight(clampMetricValue(parsed, HEIGHT_RANGE));
        }
    };

    const handleWeightBlur = () => {
        const parsed = Number.parseInt(weightInput, 10);
        const next = clampMetricValue(Number.isFinite(parsed) ? parsed : weight, WEIGHT_RANGE);
        setWeight(next);
        setWeightInput(String(next));
    };

    const handleHeightBlur = () => {
        const parsed = Number.parseInt(heightInput, 10);
        const next = clampMetricValue(Number.isFinite(parsed) ? parsed : height, HEIGHT_RANGE);
        setHeight(next);
        setHeightInput(String(next));
    };

    const handleAgeBlur = () => {
        const parsed = Number.parseInt(ageInput, 10);
        const next = clampMetricValue(Number.isFinite(parsed) ? parsed : age, AGE_RANGE);
        setAge(next);
        setAgeInput(String(next));
    };

    const adjustWeight = (delta: number) => {
        const next = clampMetricValue(weight + delta, WEIGHT_RANGE);
        setWeight(next);
        setWeightInput(String(next));
        triggerHaptic('light').catch(() => undefined);
    };

    const adjustHeight = (delta: number) => {
        const next = clampMetricValue(height + delta, HEIGHT_RANGE);
        setHeight(next);
        setHeightInput(String(next));
        triggerHaptic('light').catch(() => undefined);
    };

    const adjustAge = (delta: number) => {
        const next = clampMetricValue(age + delta, AGE_RANGE);
        setAge(next);
        setAgeInput(String(next));
        triggerHaptic('light').catch(() => undefined);
    };

    const validate = () => {
        let valid = true;
        if (!name.trim()) {
            setNameError('Name is required');
            valid = false;
        } else {
            setNameError('');
        }

        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            setEmailError('Email format is invalid');
            valid = false;
        } else {
            setEmailError('');
        }

        if (!Number.isFinite(age) || age < AGE_RANGE.min || age > AGE_RANGE.max) {
            valid = false;
            showToast('error', `Age must be between ${AGE_RANGE.min} and ${AGE_RANGE.max}.`);
        }

        return valid;
    };

    const saveProfile = async () => {
        if (!validate()) return;
        if (isSaving) return;

        setIsSaving(true);
        try {
            triggerHaptic('medium').catch(() => undefined);
            await updateUser({
                name: name.trim(),
                email: email.trim() || undefined,
                age,
                weight,
                height,
                goal,
                activityLevel,
            });
            await calculateDynamicTarget();
            posthog.capture('profile_updated', { goal, weight, height, age, activity_level: activityLevel });
            showToast('success', 'Profile updated and targets recalculated');
            router.back();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save profile changes.';
            showToast('error', message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>Edit Profile</Text>

                <Text style={{ color: '#334155', fontWeight: '600', marginTop: 16 }}>Name</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    style={{
                        marginTop: 6,
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        borderRadius: 12,
                        padding: 11,
                        color: '#0f172a',
                    }}
                />
                {nameError ? <Text style={{ color: '#dc2626', marginTop: 4, fontSize: 12 }}>{nameError}</Text> : null}

                <Text style={{ color: '#334155', fontWeight: '600', marginTop: 12 }}>Email</Text>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="name@email.com"
                    style={{
                        marginTop: 6,
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        borderRadius: 12,
                        padding: 11,
                        color: '#0f172a',
                    }}
                />
                {emailError ? <Text style={{ color: '#dc2626', marginTop: 4, fontSize: 12 }}>{emailError}</Text> : null}

                <Text style={{ color: '#334155', fontWeight: '600', marginTop: 14 }}>Age</Text>
                <View
                    style={{
                        marginTop: 8,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: '#e9d5ff',
                        backgroundColor: '#faf5ff',
                        padding: 12,
                    }}
                >
                    <Text style={{ color: '#6b21a8', fontSize: 12, fontWeight: '700' }}>Age (years)</Text>
                    <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Pressable
                            onPress={() => adjustAge(-1)}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                backgroundColor: '#f3e8ff',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 20, color: '#7e22ce', fontWeight: '700' }}>-</Text>
                        </Pressable>
                        <TextInput
                            value={ageInput}
                            onChangeText={handleAgeInputChange}
                            onBlur={handleAgeBlur}
                            keyboardType="number-pad"
                            maxLength={3}
                            style={{
                                flex: 1,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: '#e9d5ff',
                                backgroundColor: '#fff',
                                paddingVertical: 10,
                                textAlign: 'center',
                                color: '#0f172a',
                                fontSize: 18,
                                fontWeight: '700',
                            }}
                        />
                        <Pressable
                            onPress={() => adjustAge(1)}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                backgroundColor: '#f3e8ff',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 20, color: '#7e22ce', fontWeight: '700' }}>+</Text>
                        </Pressable>
                    </View>
                    <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>Range: 6-100 years</Text>
                </View>

                <Text style={{ color: '#334155', fontWeight: '600', marginTop: 14 }}>Weight & Height</Text>
                <View style={{ marginTop: 8, gap: 10 }}>
                    <View
                        style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: '#bfdbfe',
                            backgroundColor: '#eff6ff',
                            padding: 12,
                        }}
                    >
                        <Text style={{ color: '#1e3a8a', fontSize: 12, fontWeight: '700' }}>Weight (kg)</Text>
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Pressable
                                onPress={() => adjustWeight(-1)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    backgroundColor: '#dbeafe',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 20, color: '#1d4ed8', fontWeight: '700' }}>-</Text>
                            </Pressable>
                            <TextInput
                                value={weightInput}
                                onChangeText={handleWeightInputChange}
                                onBlur={handleWeightBlur}
                                keyboardType="number-pad"
                                maxLength={3}
                                style={{
                                    flex: 1,
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: '#bfdbfe',
                                    backgroundColor: '#fff',
                                    paddingVertical: 10,
                                    textAlign: 'center',
                                    color: '#0f172a',
                                    fontSize: 18,
                                    fontWeight: '700',
                                }}
                            />
                            <Pressable
                                onPress={() => adjustWeight(1)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    backgroundColor: '#dbeafe',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 20, color: '#1d4ed8', fontWeight: '700' }}>+</Text>
                            </Pressable>
                        </View>
                        <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>Range: 40-150 kg</Text>
                    </View>
                    <View
                        style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: '#bbf7d0',
                            backgroundColor: '#ecfdf5',
                            padding: 12,
                        }}
                    >
                        <Text style={{ color: '#166534', fontSize: 12, fontWeight: '700' }}>Height (cm)</Text>
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Pressable
                                onPress={() => adjustHeight(-1)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    backgroundColor: '#dcfce7',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 20, color: '#15803d', fontWeight: '700' }}>-</Text>
                            </Pressable>
                            <TextInput
                                value={heightInput}
                                onChangeText={handleHeightInputChange}
                                onBlur={handleHeightBlur}
                                keyboardType="number-pad"
                                maxLength={3}
                                style={{
                                    flex: 1,
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: '#bbf7d0',
                                    backgroundColor: '#fff',
                                    paddingVertical: 10,
                                    textAlign: 'center',
                                    color: '#0f172a',
                                    fontSize: 18,
                                    fontWeight: '700',
                                }}
                            />
                            <Pressable
                                onPress={() => adjustHeight(1)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    backgroundColor: '#dcfce7',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 20, color: '#15803d', fontWeight: '700' }}>+</Text>
                            </Pressable>
                        </View>
                        <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>Range: 120-220 cm</Text>
                    </View>
                </View>

                <Text style={{ color: '#334155', fontWeight: '600', marginTop: 14 }}>Goal</Text>
                <View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}>
                    {goalOptions.map((option) => (
                        <Pressable
                            key={option.key}
                            onPress={() => {
                                setGoal(option.key);
                                triggerHaptic('light').catch(() => undefined);
                            }}
                            android_ripple={{ color: 'rgba(22,163,74,0.14)' }}
                            style={{
                                flex: 1,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: goal === option.key ? '#16a34a' : '#e2e8f0',
                                backgroundColor: goal === option.key ? '#dcfce7' : '#fff',
                                padding: 10,
                                alignItems: 'center',
                                overflow: 'hidden',
                            }}
                        >
                            <Text style={{ fontSize: 18 }}>{option.emoji}</Text>
                            <Text style={{ color: '#0f172a', fontWeight: '700', marginTop: 4, fontSize: 12 }}>
                                {option.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={{ color: '#334155', fontWeight: '600', marginTop: 14 }}>Activity Level</Text>
                <View style={{ marginTop: 8, gap: 8 }}>
                    {activityLevelOptions.map((option) => (
                        <Pressable
                            key={option.key}
                            onPress={() => {
                                setActivityLevel(option.key);
                                triggerHaptic('light').catch(() => undefined);
                            }}
                            android_ripple={{ color: 'rgba(22,163,74,0.14)' }}
                            style={{
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: activityLevel === option.key ? '#16a34a' : '#e2e8f0',
                                backgroundColor: activityLevel === option.key ? '#dcfce7' : '#fff',
                                paddingVertical: 10,
                                paddingHorizontal: 12,
                                overflow: 'hidden',
                            }}
                        >
                            <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 13 }}>{option.label}</Text>
                            <Text style={{ color: '#64748b', marginTop: 2, fontSize: 12 }}>{option.description}</Text>
                        </Pressable>
                    ))}
                </View>

                <Pressable
                    onPress={() => {
                        saveProfile().catch(() => undefined);
                    }}
                    disabled={isSaving}
                    android_ripple={{ color: 'rgba(220,252,231,0.28)' }}
                    style={{
                        marginTop: 24,
                        borderRadius: 14,
                        backgroundColor: '#16a34a',
                        alignItems: 'center',
                        paddingVertical: 13,
                        overflow: 'hidden',
                        opacity: isSaving ? 0.65 : 1,
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '800' }}>{isSaving ? 'Saving...' : 'Save Profile'}</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}
