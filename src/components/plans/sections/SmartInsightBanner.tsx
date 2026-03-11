import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = {
    adaptation: { title: string; description: string } | null;
    onApply: () => void;
};

export default function SmartInsightBanner({ adaptation, onApply }: Props) {
    const { t } = useTranslation();

    if (!adaptation) {
        return null;
    }

    return (
        <View
            style={{
                marginTop: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#bfdbfe',
                backgroundColor: '#eff6ff',
                padding: 12,
            }}
        >
            <Text style={{ color: '#1e3a8a', fontWeight: '800' }}>{t('plans.smartInsight.title')}</Text>
            <Text style={{ color: '#1e3a8a', fontWeight: '700', marginTop: 4 }}>{adaptation.title}</Text>
            <Text style={{ color: '#1e40af', fontSize: 12, marginTop: 4 }}>{adaptation.description}</Text>
            <Pressable
                onPress={onApply}
                style={{
                    marginTop: 8,
                    alignSelf: 'flex-start',
                    borderRadius: 10,
                    backgroundColor: '#3b82f6',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                }}
            >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{t('plans.smartInsight.apply')}</Text>
            </Pressable>
        </View>
    );
}
