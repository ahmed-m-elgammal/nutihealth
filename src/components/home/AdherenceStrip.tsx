import React from 'react';
import { Text, View } from 'react-native';

type AdherenceStripProps = {
    percentage: number;
};

export default function AdherenceStrip({ percentage }: AdherenceStripProps) {
    const clamped = Math.max(0, Math.min(100, percentage));

    return (
        <View
            style={{
                marginTop: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                backgroundColor: '#fff',
                padding: 12,
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }}>Today's adherence</Text>
                <Text style={{ fontSize: 12, color: '#475569' }}>{Math.round(clamped)}% of daily goal logged</Text>
            </View>
            <View
                style={{ height: 8, marginTop: 8, borderRadius: 9999, backgroundColor: '#e2e8f0', overflow: 'hidden' }}
            >
                <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: '#16a34a' }} />
            </View>
        </View>
    );
}
