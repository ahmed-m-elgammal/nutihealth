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
};

const typeColor = {
    high: '#22c55e',
    low: '#f59e0b',
    refeed: '#8b5cf6',
};

export default function CarbCycleTab({ cycle, today }: CarbCycleTabProps) {
    const todayCycle = cycle.find((c) => c.day === today);

    return (
        <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {cycle.map((day) => {
                    const isToday = day.day === today;
                    return (
                        <View
                            key={day.day}
                            style={{
                                width: '31%',
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: isToday ? '#16a34a' : '#e2e8f0',
                                backgroundColor: '#fff',
                                padding: 10,
                            }}
                        >
                            <Text style={{ color: '#334155', fontWeight: '700', fontSize: 12 }}>
                                {day.day.slice(0, 3)}
                            </Text>
                            <View
                                style={{
                                    marginTop: 6,
                                    alignSelf: 'flex-start',
                                    borderRadius: 999,
                                    backgroundColor: `${typeColor[day.type]}22`,
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                }}
                            >
                                <Text style={{ color: typeColor[day.type], fontWeight: '700', fontSize: 11 }}>
                                    {day.type}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>

            {todayCycle?.adjustedMacros ? (
                <View
                    style={{
                        marginTop: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#bbf7d0',
                        backgroundColor: '#f0fdf4',
                        padding: 12,
                    }}
                >
                    <Text style={{ color: '#166534', fontWeight: '700' }}>Today&apos;s adjusted macros</Text>
                    <Text style={{ color: '#166534', marginTop: 4, fontSize: 12 }}>
                        {todayCycle.adjustedCalories || 0} kcal • P {todayCycle.adjustedMacros.protein}g • C{' '}
                        {todayCycle.adjustedMacros.carbs}g • F {todayCycle.adjustedMacros.fats}g
                    </Text>
                </View>
            ) : null}
        </View>
    );
}
