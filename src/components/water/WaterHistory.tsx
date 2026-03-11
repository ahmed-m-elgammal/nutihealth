import React, { memo, useCallback } from 'react';
import { Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Droplets } from 'lucide-react-native';

type WaterHistoryEntry = {
    id: string;
    time: string;
    amount: number;
};

type WaterHistoryProps = {
    entries: WaterHistoryEntry[];
};

const HistoryRow = memo(({ item }: { item: WaterHistoryEntry }) => (
    <View
        style={{
            borderRadius: 12,
            backgroundColor: '#1e293b',
            borderWidth: 1,
            borderColor: '#334155',
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
        }}
    >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Droplets size={16} color="#10b748" />
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>{item.time}</Text>
        </View>
        <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 14 }}>+{item.amount} ml</Text>
    </View>
));

function WaterHistory({ entries }: WaterHistoryProps) {
    const keyExtractor = useCallback((item: WaterHistoryEntry) => item.id, []);
    const renderItem = useCallback(({ item }: { item: WaterHistoryEntry }) => <HistoryRow item={item} />, []);

    return (
        <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: '700', color: '#94a3b8', marginBottom: 10, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Today's History
            </Text>
            <FlashList
                data={entries}
                scrollEnabled={false}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListEmptyComponent={
                    <Text style={{ color: '#64748b', textAlign: 'center', paddingVertical: 16 }}>No water logs yet today.</Text>
                }
            />
        </View>
    );
}

export default memo(WaterHistory);
