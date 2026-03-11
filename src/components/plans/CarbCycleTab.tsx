import React from 'react';
import { Text, View } from 'react-native';

type Macro = { protein: number; carbs: number; fats: number };

type CycleDay = {
    day: string;
    type: 'high' | 'low' | 'refeed';
    adjustedCalories?: number;
    adjustedMacros?: Macro;
};

type CarbCycleTabProps = {
    cycle: CycleDay[];
    today: string;
    todayTarget?: {
        type: 'high' | 'low' | 'refeed';
        calories: number;
        macros: Macro;
        source?: 'stored-plan' | 'derived';
    } | null;
};

const typeColor = {
    high: { text: '#4ade80', badge: 'rgba(74,222,128,0.15)' },
    low: { text: '#fbbf24', badge: 'rgba(251,191,36,0.15)' },
    refeed: { text: '#a78bfa', badge: 'rgba(167,139,250,0.15)' },
};

// Dark-mode safe colours — no hardcoded white
const COLORS = {
    cardBg: '#1e293b',
    cardBorder: '#334155',
    todayBorder: '#16a34a',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
    highlightBg: 'rgba(22,163,74,0.12)',
    highlightBdr: 'rgba(22,163,74,0.4)',
};

export default function CarbCycleTab({ cycle, today, todayTarget }: CarbCycleTabProps) {
    const todayCycle = cycle.find((c) => c.day === today);
    const effectiveTodayType = todayTarget?.type ?? todayCycle?.type;
    const effectiveTodayCalories = todayTarget?.calories ?? todayCycle?.adjustedCalories;
    const effectiveTodayMacros = todayTarget?.macros ?? todayCycle?.adjustedMacros;

    return (
        <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {cycle.map((day) => {
                    const isToday = day.day === today;
                    const tc = typeColor[day.type];
                    return (
                        <View
                            key={day.day}
                            style={{
                                width: '31%',
                                borderRadius: 12,
                                borderWidth: isToday ? 2 : 1,
                                borderColor: isToday ? COLORS.todayBorder : COLORS.cardBorder,
                                backgroundColor: COLORS.cardBg,
                                padding: 10,
                            }}
                        >
                            <Text
                                style={{
                                    color: isToday ? '#f8fafc' : COLORS.textMuted,
                                    fontWeight: '700',
                                    fontSize: 12,
                                }}
                            >
                                {day.day.slice(0, 3)}
                            </Text>
                            <View
                                style={{
                                    marginTop: 6,
                                    alignSelf: 'flex-start',
                                    borderRadius: 999,
                                    backgroundColor: tc.badge,
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                }}
                            >
                                <Text
                                    style={{
                                        color: tc.text,
                                        fontWeight: '700',
                                        fontSize: 11,
                                    }}
                                >
                                    {day.type}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>

            {effectiveTodayType && effectiveTodayMacros ? (
                <View
                    style={{
                        marginTop: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: COLORS.highlightBdr,
                        backgroundColor: COLORS.highlightBg,
                        padding: 12,
                    }}
                >
                    <Text style={{ color: '#4ade80', fontWeight: '800', fontSize: 14 }}>
                        Today is a {effectiveTodayType.toUpperCase()} carb day
                    </Text>
                    <Text style={{ color: COLORS.textMuted, marginTop: 4, fontSize: 12 }}>
                        {effectiveTodayCalories ?? 0} kcal
                        {'  ·  '}P {effectiveTodayMacros.protein}g{'  ·  '}C {effectiveTodayMacros.carbs}g{'  ·  '}F{' '}
                        {effectiveTodayMacros.fats}g
                    </Text>
                    {todayTarget?.source === 'stored-plan' && (
                        <Text style={{ color: COLORS.textMuted, marginTop: 4, fontSize: 11 }}>
                            Synced from your saved carb-cycle plan.
                        </Text>
                    )}
                </View>
            ) : null}
        </View>
    );
}
