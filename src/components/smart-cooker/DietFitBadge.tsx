import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface DietFitBadgeProps {
    label: string;
}

export default function DietFitBadge({ label }: DietFitBadgeProps) {
    const { t } = useTranslation();
    const normalized = (label || '').toLowerCase();
    const isFit =
        normalized.includes('fit') ||
        normalized.includes('goal') ||
        normalized.includes('مناسب') ||
        normalized.includes('ضمن');
    const mappedLabel = isFit ? t('smartCooker.dietFit.fits') : t('smartCooker.dietFit.over');
    const resolvedLabel = normalized ? mappedLabel : t('smartCooker.dietFit.over');

    return (
        <View
            style={{
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
                backgroundColor: isFit ? '#dcfce7' : '#fee2e2',
                borderWidth: 1,
                borderColor: isFit ? '#86efac' : '#fecaca',
                alignSelf: 'flex-start',
            }}
        >
            <Text style={{ fontSize: 12, fontWeight: '700', color: isFit ? '#166534' : '#991b1b' }}>{resolvedLabel}</Text>
        </View>
    );
}
