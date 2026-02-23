import React, { memo, useCallback } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { triggerHaptic } from '../../utils/haptics';

type TemplateItem = {
    id: string;
    name: string;
    type: string;
    calories: string;
    color: string;
    score?: number;
    insight?: string;
};

type TemplateLibraryProps = {
    templates: TemplateItem[];
    onTemplatePress: (template: TemplateItem) => void;
    onTemplateLongPress: (template: TemplateItem) => void;
};

const TemplateCard = memo(
    ({ item, onPress, onLongPress }: { item: TemplateItem; onPress: () => void; onLongPress: () => void }) => (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            android_ripple={{ color: 'rgba(15,23,42,0.08)' }}
            style={{
                width: 220,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                backgroundColor: '#fff',
                overflow: 'hidden',
                marginRight: 10,
            }}
        >
            <View style={{ height: 5, backgroundColor: item.color }} />
            <View style={{ padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#0f172a', fontWeight: '800', flexShrink: 1, paddingRight: 6 }}>
                        {item.name}
                    </Text>
                    {typeof item.score === 'number' ? (
                        <View
                            style={{
                                borderRadius: 999,
                                backgroundColor: '#ecfdf5',
                                borderWidth: 1,
                                borderColor: '#bbf7d0',
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                            }}
                        >
                            <Text style={{ color: '#166534', fontSize: 10, fontWeight: '800' }}>{item.score}% fit</Text>
                        </View>
                    ) : null}
                </View>
                <Text style={{ color: '#64748b', marginTop: 4, fontSize: 12 }}>{item.type}</Text>
                <Text style={{ color: '#334155', marginTop: 8, fontSize: 12 }}>{item.calories}</Text>
                {item.insight ? (
                    <Text style={{ color: '#475569', marginTop: 6, fontSize: 11 }} numberOfLines={2}>
                        {item.insight}
                    </Text>
                ) : null}
            </View>
        </Pressable>
    ),
);

function TemplateLibrary({ templates, onTemplatePress, onTemplateLongPress }: TemplateLibraryProps) {
    const keyExtractor = useCallback((item: TemplateItem) => item.id, []);

    const renderItem = useCallback(
        ({ item }: { item: TemplateItem }) => (
            <TemplateCard
                item={item}
                onPress={() => onTemplatePress(item)}
                onLongPress={() => {
                    triggerHaptic('medium').catch(() => undefined);
                    Alert.alert('Activate template', `Activate ${item.name}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Activate', onPress: () => onTemplateLongPress(item) },
                    ]);
                }}
            />
        ),
        [onTemplateLongPress, onTemplatePress],
    );

    return (
        <View style={{ marginTop: 16 }}>
            <Text style={{ color: '#0f172a', fontWeight: '800', marginBottom: 8 }}>Template Library</Text>
            <FlashList
                horizontal
                data={templates}
                keyExtractor={keyExtractor}
                decelerationRate="fast"
                snapToAlignment="start"
                showsHorizontalScrollIndicator={false}
                renderItem={renderItem}
            />
        </View>
    );
}

export default memo(TemplateLibrary);
