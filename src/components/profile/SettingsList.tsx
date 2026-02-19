import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ChevronRight } from 'lucide-react-native';
import { useColors } from '../../hooks/useColors';
import { designTokens } from '../../theme/design-tokens';

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

const HeaderRow = memo(({ title, color }: { title: string; color: string }) => (
    <View style={{ paddingTop: designTokens.spacing.lg, paddingBottom: designTokens.spacing.xs + 2 }}>
        <Text
            style={{
                color,
                fontSize: designTokens.typography.size.caption,
                fontWeight: '700',
                textTransform: 'uppercase',
            }}
        >
            {title}
        </Text>
    </View>
));

const ItemRow = memo(
    ({ item, isLast, colors }: { item: SettingsItem; isLast: boolean; colors: ReturnType<typeof useColors> }) => {
        const content = (
            <>
                <View
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: colors.surface.surfaceVariant,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                    }}
                >
                    {item.icon}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text.primary, fontWeight: '600' }}>{item.label}</Text>
                    {'subtitle' in item && item.subtitle ? (
                        <Text style={{ color: colors.text.secondary, fontSize: 12, marginTop: 2 }}>
                            {item.subtitle}
                        </Text>
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
                        trackColor={{ false: colors.surface.outlineVariant, true: colors.brand.primary[300] }}
                        thumbColor={item.value ? colors.brand.primary[600] : colors.surface.surface}
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
                    borderBottomColor: colors.surface.outline,
                    marginLeft: isLast ? 0 : 56,
                }}
            >
                {content}
                {item.type === 'badge' ? (
                    <View
                        style={{
                            borderRadius: 999,
                            backgroundColor: colors.brand.secondary[100],
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                        }}
                    >
                        <Text style={{ color: colors.brand.secondary[700], fontSize: 11, fontWeight: '700' }}>
                            {item.badge}
                        </Text>
                    </View>
                ) : null}
                {item.type === 'navigation' && item.value ? (
                    <Text style={{ color: colors.text.secondary, fontSize: 12, marginRight: 6 }}>{item.value}</Text>
                ) : null}
                <ChevronRight size={16} color={colors.surface.outlineVariant} />
            </Pressable>
        );
    },
);

function SettingsList({ sections }: SettingsListProps) {
    const colors = useColors();

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
    const renderItem = useCallback(
        ({ item }: { item: Row }) => {
            if (item.kind === 'header') return <HeaderRow title={item.title} color={colors.text.secondary} />;
            return <ItemRow item={item.item} isLast={item.isLast} colors={colors} />;
        },
        [colors],
    );

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
