import React, { memo } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
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
    subtitle?: string;
    badge: string;
    onPress: () => void;
};

type SettingsItem = NavItem | ToggleItem | BadgeItem;
type SettingsSection = {
    title: string;
    items: SettingsItem[];
    sectionKey?: string;
    sectionRef?: React.RefObject<View>;
};
type SettingsListProps = { sections: SettingsSection[] };

const CARD_BG = '#1e293b';
const BORDER = '#334155';
const TEXT_PRIMARY = '#f8fafc';
const TEXT_SECONDARY = '#94a3b8';
const ACCENT = '#10b748';
const ICON_BG = '#0f2d1a';

const HeaderRow = memo(({ title }: { title: string }) => (
    <View style={{ paddingTop: 24, paddingBottom: 8 }}>
        <Text
            style={{
                color: TEXT_SECONDARY,
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
            }}
        >
            {title}
        </Text>
    </View>
));

const ItemRow = memo(({ item, isLast }: { item: SettingsItem; isLast: boolean }) => {
    const content = (
        <>
            <View
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: ICON_BG,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    borderWidth: 1,
                    borderColor: '#1a3d26',
                }}
            >
                {item.icon}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: TEXT_PRIMARY, fontWeight: '600', fontSize: 15 }}>{item.label}</Text>
                {'subtitle' in item && item.subtitle ? (
                    <Text style={{ color: TEXT_SECONDARY, fontSize: 12, marginTop: 2 }}>{item.subtitle}</Text>
                ) : null}
            </View>
        </>
    );

    const rowStyle = {
        backgroundColor: CARD_BG,
        borderRadius: isLast ? 12 : 0,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: BORDER,
        overflow: 'hidden' as const,
    };

    if (item.type === 'toggle') {
        return (
            <View style={rowStyle}>
                {content}
                <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: '#334155', true: '#15803d' }}
                    thumbColor={item.value ? ACCENT : '#64748b'}
                    ios_backgroundColor="#334155"
                />
            </View>
        );
    }

    return (
        <Pressable onPress={item.onPress} android_ripple={{ color: 'rgba(16,183,72,0.08)' }} style={rowStyle}>
            {content}
            {item.type === 'badge' ? (
                <View
                    style={{
                        borderRadius: 999,
                        backgroundColor: 'rgba(16,183,72,0.15)',
                        paddingHorizontal: 9,
                        paddingVertical: 3,
                        marginRight: 6,
                    }}
                >
                    <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '700' }}>{item.badge}</Text>
                </View>
            ) : null}
            {item.type === 'navigation' && item.value ? (
                <Text style={{ color: TEXT_SECONDARY, fontSize: 12, marginRight: 6 }}>{item.value}</Text>
            ) : null}
            <ChevronRight size={16} color="#475569" />
        </Pressable>
    );
});

function SettingsList({ sections }: SettingsListProps) {
    return (
        <View>
            {sections.map((section) => (
                <View key={section.sectionKey || section.title} ref={section.sectionRef}>
                    <HeaderRow title={section.title} />
                    <View
                        style={{
                            backgroundColor: CARD_BG,
                            borderRadius: 12,
                            overflow: 'hidden',
                            borderWidth: 1,
                            borderColor: BORDER,
                        }}
                    >
                        {section.items.map((item, index) => (
                            <ItemRow key={item.key} item={item} isLast={index === section.items.length - 1} />
                        ))}
                    </View>
                </View>
            ))}
        </View>
    );
}

export default memo(SettingsList);
