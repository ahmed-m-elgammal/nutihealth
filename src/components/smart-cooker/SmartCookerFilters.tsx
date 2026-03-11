import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { RotateCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { SmartCookerMealType, SmartCookerStrictness } from '../../services/api/smartCooker';

interface SmartCookerFiltersProps {
    strictness: SmartCookerStrictness;
    mealType: SmartCookerMealType;
    onStrictnessChange: (next: SmartCookerStrictness) => void;
    onMealTypeChange: (next: SmartCookerMealType) => void;
    onRefresh: () => void;
    refreshing?: boolean;
    refreshDisabled?: boolean;
}

const MEAL_TYPES: SmartCookerMealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const STRICTNESS_OPTIONS: SmartCookerStrictness[] = ['exact', 'flexible'];

export default function SmartCookerFilters({
    strictness,
    mealType,
    onStrictnessChange,
    onMealTypeChange,
    onRefresh,
    refreshing = false,
    refreshDisabled = false,
}: SmartCookerFiltersProps) {
    const { t } = useTranslation();

    return (
        <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                {STRICTNESS_OPTIONS.map((option) => {
                    const selected = strictness === option;
                    return (
                        <Pressable
                            key={option}
                            onPress={() => onStrictnessChange(option)}
                            style={{
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: selected ? '#2563eb' : '#cbd5e1',
                                backgroundColor: selected ? '#dbeafe' : '#fff',
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                            }}
                        >
                            <Text style={{ fontWeight: '700', color: selected ? '#1d4ed8' : '#334155' }}>
                                {t(`smartCooker.filters.strictness.${option}`)}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {MEAL_TYPES.map((option) => {
                    const selected = mealType === option;
                    return (
                        <Pressable
                            key={option}
                            onPress={() => onMealTypeChange(option)}
                            style={{
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: selected ? '#16a34a' : '#cbd5e1',
                                backgroundColor: selected ? '#dcfce7' : '#fff',
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                            }}
                        >
                            <Text style={{ fontWeight: '700', color: selected ? '#166534' : '#334155' }}>
                                {t(`recipeImport.mealTypes.${option}`)}
                            </Text>
                        </Pressable>
                    );
                })}

                <Pressable
                    onPress={onRefresh}
                    disabled={refreshing || refreshDisabled}
                    style={{
                        marginLeft: 'auto',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        backgroundColor: refreshing || refreshDisabled ? '#f1f5f9' : '#fff',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        opacity: refreshing || refreshDisabled ? 0.75 : 1,
                    }}
                >
                    <RotateCw size={14} color="#334155" />
                    <Text style={{ fontWeight: '700', color: '#334155' }}>
                        {refreshing ? t('smartCooker.actions.refreshing') : t('smartCooker.actions.refresh')}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
