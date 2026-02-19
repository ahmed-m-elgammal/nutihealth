import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { triggerHaptic } from '../../utils/haptics';

type Plan = {
    id: string;
    name: string;
    isActive: boolean;
    dailyCalories: number;
    macros: { protein: number; carbs: number; fats: number };
    startDate: Date;
    endDate?: Date;
};

type ActivePlanHeroProps = {
    plan?: Plan | null;
    onEdit: () => void;
    onDeactivate: () => void;
    onCreatePlan: () => void;
};

export default function ActivePlanHero({ plan, onEdit, onDeactivate, onCreatePlan }: ActivePlanHeroProps) {
    if (!plan) {
        return (
            <View
                style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: '#94a3b8',
                    backgroundColor: '#fff',
                    padding: 16,
                }}
            >
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>No active diet plan</Text>
                <Text style={{ marginTop: 6, color: '#64748b' }}>
                    Create your first plan to unlock guided meals and prep.
                </Text>
                <Pressable
                    onPress={onCreatePlan}
                    android_ripple={{ color: 'rgba(22,163,74,0.2)' }}
                    style={{
                        marginTop: 12,
                        alignSelf: 'flex-start',
                        borderRadius: 12,
                        backgroundColor: '#16a34a',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        overflow: 'hidden',
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Create Your Plan</Text>
                </Pressable>
            </View>
        );
    }

    const totalMacros = Math.max(1, plan.macros.protein + plan.macros.carbs + plan.macros.fats);
    const proteinPct = (plan.macros.protein / totalMacros) * 100;
    const carbsPct = (plan.macros.carbs / totalMacros) * 100;
    const fatsPct = (plan.macros.fats / totalMacros) * 100;

    const durationText = plan.endDate
        ? `${Math.max(0, Math.ceil((plan.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)))} weeks left`
        : 'Ongoing';

    return (
        <View
            style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#dbeafe',
                backgroundColor: '#fff',
                padding: 16,
                elevation: 4,
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800', flex: 1 }}>{plan.name}</Text>
                {plan.isActive ? (
                    <View
                        style={{
                            borderRadius: 999,
                            backgroundColor: '#dcfce7',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                        }}
                    >
                        <Text style={{ color: '#166534', fontWeight: '700', fontSize: 11 }}>Active</Text>
                    </View>
                ) : null}
            </View>

            <Text style={{ marginTop: 10, color: '#0f172a', fontSize: 26, fontWeight: '800' }}>
                {plan.dailyCalories} kcal
            </Text>
            <Text style={{ color: '#64748b', marginTop: 2 }}>Daily target</Text>

            <View
                style={{
                    marginTop: 12,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: '#e2e8f0',
                    overflow: 'hidden',
                    flexDirection: 'row',
                }}
            >
                <View style={{ width: `${proteinPct}%`, backgroundColor: '#3b82f6' }} />
                <View style={{ width: `${carbsPct}%`, backgroundColor: '#f59e0b' }} />
                <View style={{ width: `${fatsPct}%`, backgroundColor: '#ec4899' }} />
            </View>

            <Text style={{ marginTop: 8, color: '#334155', fontSize: 12 }}>
                P {plan.macros.protein}g • C {plan.macros.carbs}g • F {plan.macros.fats}g
            </Text>
            <Text style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>
                Started {format(plan.startDate, 'MMM d')} • {durationText}
            </Text>

            <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
                <Pressable
                    onPress={() => {
                        triggerHaptic('light').catch(() => undefined);
                        onEdit();
                    }}
                    android_ripple={{ color: 'rgba(37,99,235,0.14)' }}
                    style={{
                        flex: 1,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#93c5fd',
                        alignItems: 'center',
                        paddingVertical: 10,
                        overflow: 'hidden',
                    }}
                >
                    <Text style={{ color: '#1d4ed8', fontWeight: '700' }}>Edit Plan</Text>
                </Pressable>
                <Pressable
                    onPress={() => {
                        triggerHaptic('light').catch(() => undefined);
                        onDeactivate();
                    }}
                    android_ripple={{ color: 'rgba(239,68,68,0.12)' }}
                    style={{
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 12,
                        overflow: 'hidden',
                    }}
                >
                    <Text style={{ color: '#dc2626', fontWeight: '700' }}>Deactivate</Text>
                </Pressable>
            </View>
        </View>
    );
}
