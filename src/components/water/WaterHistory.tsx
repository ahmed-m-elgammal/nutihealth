import React, { memo, useCallback } from 'react';
import { Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

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
            borderRadius: 10,
            backgroundColor: '#f8fafc',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
        }}
    >
        <Text style={{ color: '#334155' }}>{item.time}</Text>
        <Text style={{ color: '#0f172a', fontWeight: '700' }}>{item.amount} ml</Text>
    </View>
));

function WaterHistory({ entries }: WaterHistoryProps) {
    const keyExtractor = useCallback((item: WaterHistoryEntry) => item.id, []);
    const renderItem = useCallback(({ item }: { item: WaterHistoryEntry }) => <HistoryRow item={item} />, []);

    return (
        <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>Today&apos;s History</Text>
            <FlashList
                data={entries}
                estimatedItemSize={48}
                scrollEnabled={false}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListEmptyComponent={<Text style={{ color: '#64748b' }}>No water logs yet today.</Text>}
            />
        </View>
    );
}

export default memo(WaterHistory);
