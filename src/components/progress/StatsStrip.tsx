import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

type Stat = {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
};

type StatsStripProps = {
    stats: Stat[];
};

export default function StatsStrip({ stats }: StatsStripProps) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 8 }}
        >
            {stats.map((stat, index) => (
                <Animated.View
                    entering={FadeInRight.delay(index * 70).duration(260)}
                    key={stat.label}
                    style={{ minWidth: 150, borderRadius: 14, backgroundColor: '#f1f5f9', padding: 12 }}
                >
                    <View
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: stat.color,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {stat.icon}
                    </View>
                    <Text style={{ marginTop: 10, fontSize: 18, fontWeight: '700', color: '#0f172a' }}>
                        {stat.value}
                    </Text>
                    <Text style={{ marginTop: 2, fontSize: 12, color: '#475569' }}>{stat.label}</Text>
                </Animated.View>
            ))}
        </ScrollView>
    );
}
