import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Scale } from 'lucide-react-native';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useProgressMutations } from '../../query/queries/useProgress';
import { useUIStore } from '../../store/uiStore';
import { useWaterStore } from '../../store/waterStore';
import { useColors } from '../../hooks/useColors';
import { triggerHaptic } from '../../utils/haptics';

const MIN_WEIGHT = 30;
const MAX_WEIGHT = 300;

const normalizeWeightInput = (value: string): string =>
    value
        .replace(',', '.')
        .replace(/[^0-9.]/g, '')
        .replace(/^(\d*\.\d*).*$/, '$1');

export default function LogWeightModal() {
    const router = useRouter();
    const colors = useColors();
    const showToast = useUIStore((state) => state.showToast);
    const { user } = useCurrentUser();
    const { logWeight } = useProgressMutations();
    const calculateDynamicTarget = useWaterStore((state) => state.calculateDynamicTarget);

    const initialWeight = useMemo(() => {
        const userWeight = Number(user?.weight);
        if (!Number.isFinite(userWeight) || userWeight <= 0) {
            return '';
        }
        return String(userWeight);
    }, [user?.weight]);

    const [weightInput, setWeightInput] = useState(initialWeight);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setWeightInput(initialWeight);
    }, [initialWeight]);

    const onSave = async () => {
        if (!user?.id) {
            showToast('error', 'Profile not found. Please reopen the app and try again.');
            return;
        }

        const parsed = Number(weightInput);
        if (!Number.isFinite(parsed) || parsed < MIN_WEIGHT || parsed > MAX_WEIGHT) {
            Alert.alert('Invalid weight', `Enter a value between ${MIN_WEIGHT} and ${MAX_WEIGHT} kg.`);
            return;
        }

        setIsSaving(true);
        try {
            await logWeight.mutateAsync({
                userId: user.id,
                weight: Math.round(parsed * 10) / 10,
            });
            await calculateDynamicTarget();
            triggerHaptic('success').catch(() => undefined);
            showToast('success', 'Weight logged successfully.');
            router.back();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save weight entry.';
            triggerHaptic('error').catch(() => undefined);
            showToast('error', message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView
            edges={['top']}
            style={{ flex: 1, backgroundColor: colors.surface.background, paddingHorizontal: 16, paddingBottom: 24 }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Pressable
                    onPress={() => router.back()}
                    android_ripple={{ color: 'rgba(15,23,42,0.08)' }}
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.surface.surfaceVariant,
                        overflow: 'hidden',
                    }}
                >
                    <ChevronLeft size={22} color={colors.text.primary} />
                </Pressable>
                <Text style={{ marginLeft: 12, fontSize: 21, fontWeight: '800', color: colors.text.primary }}>
                    Log weight
                </Text>
            </View>

            <View
                style={{
                    marginTop: 20,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.surface.outline,
                    backgroundColor: colors.surface.surface,
                    padding: 14,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: colors.brand.primary[100],
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Scale size={18} color={colors.brand.primary[700]} />
                    </View>
                    <Text style={{ marginLeft: 10, fontWeight: '700', color: colors.text.primary }}>
                        Today&apos;s body weight
                    </Text>
                </View>

                <TextInput
                    value={weightInput}
                    onChangeText={(value) => setWeightInput(normalizeWeightInput(value))}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 72.4"
                    placeholderTextColor={colors.text.secondary}
                    style={{
                        marginTop: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.surface.outline,
                        backgroundColor: colors.surface.surfaceVariant,
                        paddingHorizontal: 12,
                        paddingVertical: 11,
                        color: colors.text.primary,
                        fontWeight: '600',
                    }}
                />
                <Text style={{ marginTop: 8, color: colors.text.secondary, fontSize: 12 }}>
                    This updates both your weight history and current profile weight.
                </Text>
            </View>

            <Pressable
                onPress={() => {
                    onSave().catch(() => undefined);
                }}
                disabled={isSaving}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                style={{
                    marginTop: 'auto',
                    borderRadius: 14,
                    backgroundColor: colors.brand.primary[600],
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 14,
                    overflow: 'hidden',
                    opacity: isSaving ? 0.6 : 1,
                }}
            >
                <Text style={{ color: '#ffffff', fontWeight: '800' }}>{isSaving ? 'Saving...' : 'Save weight'}</Text>
            </Pressable>
        </SafeAreaView>
    );
}
