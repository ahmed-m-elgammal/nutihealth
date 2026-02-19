import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ChevronRight } from 'lucide-react-native';

type NavItem = {
    type: 'navigation';
    key: string;
    icon: React.ReactNode;
    label: string;
    subtitle?: string;
    value?: string;
    onPress: () => void;
};

type ToggleItem = {
    type: 'toggle';
    key: string;
    icon: React.ReactNode;
    label: string;
    value: boolean;
    onToggle: (value: boolean) => void;
};

type BadgeItem = {
    type: 'badge';
    key: string;
    icon: React.ReactNode;
    label: string;
    badge: string;
    onPress: () => void;
};

type SettingsItem = NavItem | ToggleItem | BadgeItem;
type SettingsSection = { title: string; items: SettingsItem[] };
type SettingsListProps = { sections: SettingsSection[] };

type Row =
    | { key: string; kind: 'header'; title: string }
    | { key: string; kind: 'item'; item: SettingsItem; isLast: boolean };

const HeaderRow = memo(({ title }: { title: string }) => (
    <View style={{ paddingTop: 16, paddingBottom: 6 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>{title}</Text>
    </View>
));

const ItemRow = memo(({ item, isLast }: { item: SettingsItem; isLast: boolean }) => {
    const content = (
        <>
            <View
                style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                }}
            >
                {item.icon}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: '#0f172a', fontWeight: '600' }}>{item.label}</Text>
                {'subtitle' in item && item.subtitle ? (
                    <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{item.subtitle}</Text>
                ) : null}
            </View>
        </>
    );

    if (item.type === 'toggle') {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                {content}
                <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: '#cbd5e1', true: '#86efac' }}
                    thumbColor={item.value ? '#16a34a' : '#f8fafc'}
                />
            </View>
        );
    }

    return (
        <Pressable
            onPress={item.onPress}
            android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                overflow: 'hidden',
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: '#e2e8f0',
                marginLeft: isLast ? 0 : 56,
            }}
        >
            {content}
            {item.type === 'badge' ? (
                <View
                    style={{
                        borderRadius: 999,
                        backgroundColor: '#e0f2fe',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                    }}
                >
                    <Text style={{ color: '#0369a1', fontSize: 11, fontWeight: '700' }}>{item.badge}</Text>
                </View>
            ) : null}
            {item.type === 'navigation' && item.value ? (
                <Text style={{ color: '#64748b', fontSize: 12, marginRight: 6 }}>{item.value}</Text>
            ) : null}
            <ChevronRight size={16} color="#94a3b8" />
        </Pressable>
    );
});

function SettingsList({ sections }: SettingsListProps) {
    const rows = useMemo<Row[]>(
        () =>
            sections.flatMap((section) => [
                { key: `header-${section.title}`, kind: 'header', title: section.title } as const,
                ...section.items.map(
                    (item, index) =>
                        ({ key: item.key, kind: 'item', item, isLast: index === section.items.length - 1 }) as const,
                ),
            ]),
        [sections],
    );

    const keyExtractor = useCallback((item: Row) => item.key, []);
    const getItemType = useCallback((item: Row) => item.kind, []);
    const renderItem = useCallback(({ item }: { item: Row }) => {
        if (item.kind === 'header') return <HeaderRow title={item.title} />;
        return <ItemRow item={item.item} isLast={item.isLast} />;
    }, []);

    return (
        <FlashList
            data={rows}
            keyExtractor={keyExtractor}
            getItemType={getItemType}
            estimatedItemSize={62}
            scrollEnabled={false}
            renderItem={renderItem}
        />
    );
}

export default memo(SettingsList);
