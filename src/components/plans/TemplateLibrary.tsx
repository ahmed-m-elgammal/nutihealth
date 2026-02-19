import React, { memo, useCallback } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { triggerHaptic } from '../../utils/haptics';

type TemplateItem = { id: string; name: string; type: string; calories: string; color: string };

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
                <Text style={{ color: '#0f172a', fontWeight: '800' }}>{item.name}</Text>
                <Text style={{ color: '#64748b', marginTop: 4, fontSize: 12 }}>{item.type}</Text>
                <Text style={{ color: '#334155', marginTop: 8, fontSize: 12 }}>{item.calories}</Text>
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
                estimatedItemSize={220}
                decelerationRate="fast"
                snapToAlignment="start"
                showsHorizontalScrollIndicator={false}
                renderItem={renderItem}
            />
        </View>
    );
}

export default memo(TemplateLibrary);
