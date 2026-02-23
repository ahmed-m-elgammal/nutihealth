import React, { useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { triggerHaptic } from '../../utils/haptics';
import { useUserStore } from '../../store/userStore';
import { useUIStore } from '../../store/uiStore';

type GoalOption = 'weight_loss' | 'general_fitness' | 'muscle_gain';

const goalOptions: Array<{ key: GoalOption; label: string; emoji: string }> = [
    { key: 'weight_loss', label: 'Weight Loss', emoji: '🔥' },
    { key: 'general_fitness', label: 'Maintain', emoji: '⚖️' },
    { key: 'muscle_gain', label: 'Gain', emoji: '💪' },
];

export default function EditProfileScreen() {
    const router = useRouter();
    const user = useUserStore((state) => state.user);
    const updateUser = useUserStore((state) => state.updateUser);
    const showToast = useUIStore((state) => state.showToast);

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [weight, setWeight] = useState(user?.weight || 70);
    const [height, setHeight] = useState(user?.height || 170);
    const [goal, setGoal] = useState<GoalOption>((user?.goal as GoalOption) || 'general_fitness');

    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');

    const weightValues = useMemo(() => Array.from({ length: 111 }, (_, i) => i + 40), []);
    const heightValues = useMemo(() => Array.from({ length: 101 }, (_, i) => i + 120), []);

    const weightRef = useRef<FlatList<number>>(null);
    const heightRef = useRef<FlatList<number>>(null);

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

        return valid;
    };

    const saveProfile = async () => {
        if (!validate()) return;
        triggerHaptic('medium').catch(() => undefined);
        await updateUser({
            name: name.trim(),
            email: email.trim() || undefined,
            weight,
            height,
            goal,
        });
        showToast('success', 'Profile updated and targets recalculated');
        router.back();
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
            <View style={{ flex: 1, padding: 16 }}>
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

                <Text style={{ color: '#334155', fontWeight: '600', marginTop: 14 }}>Weight & Height</Text>
                <View style={{ marginTop: 8, flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Weight (kg)</Text>
                        <FlatList
                            ref={weightRef}
                            data={weightValues}
                            keyExtractor={(item) => `w-${item}`}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            decelerationRate="fast"
                            snapToInterval={56}
                            contentContainerStyle={{ gap: 8 }}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() => {
                                        setWeight(item);
                                        triggerHaptic('light').catch(() => undefined);
                                    }}
                                    style={{
                                        width: 48,
                                        borderRadius: 10,
                                        borderWidth: 1,
                                        borderColor: item === weight ? '#16a34a' : '#e2e8f0',
                                        backgroundColor: item === weight ? '#dcfce7' : '#fff',
                                        paddingVertical: 10,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: '#0f172a', fontWeight: '700' }}>{item}</Text>
                                </Pressable>
                            )}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Height (cm)</Text>
                        <FlatList
                            ref={heightRef}
                            data={heightValues}
                            keyExtractor={(item) => `h-${item}`}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            decelerationRate="fast"
                            snapToInterval={56}
                            contentContainerStyle={{ gap: 8 }}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() => {
                                        setHeight(item);
                                        triggerHaptic('light').catch(() => undefined);
                                    }}
                                    style={{
                                        width: 48,
                                        borderRadius: 10,
                                        borderWidth: 1,
                                        borderColor: item === height ? '#16a34a' : '#e2e8f0',
                                        backgroundColor: item === height ? '#dcfce7' : '#fff',
                                        paddingVertical: 10,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: '#0f172a', fontWeight: '700' }}>{item}</Text>
                                </Pressable>
                            )}
                        />
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

                <Pressable
                    onPress={() => {
                        saveProfile().catch(() => undefined);
                    }}
                    android_ripple={{ color: 'rgba(220,252,231,0.28)' }}
                    style={{
                        marginTop: 'auto',
                        borderRadius: 14,
                        backgroundColor: '#16a34a',
                        alignItems: 'center',
                        paddingVertical: 13,
                        overflow: 'hidden',
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '800' }}>Save Profile</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
