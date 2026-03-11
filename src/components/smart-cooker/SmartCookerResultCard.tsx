import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Clock3, ExternalLink, Flame, Info } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import type { SmartCookerSuggestion } from '../../services/api/smartCooker';
import IngredientCoverageBar from './IngredientCoverageBar';
import DietFitBadge from './DietFitBadge';

interface SmartCookerResultCardProps {
    suggestion: SmartCookerSuggestion;
    onPress: (suggestion: SmartCookerSuggestion) => void;
    onOpenRecipe?: (suggestion: SmartCookerSuggestion) => void;
}

export default function SmartCookerResultCard({ suggestion, onPress, onOpenRecipe }: SmartCookerResultCardProps) {
    const { t } = useTranslation();
    const confidenceKey = ['high', 'medium', 'low'].includes(suggestion.estimated_nutrition.confidence)
        ? suggestion.estimated_nutrition.confidence
        : 'unknown';

    return (
        <Pressable
            onPress={() => onPress(suggestion)}
            android_ripple={{ color: 'rgba(15,23,42,0.08)' }}
            style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                backgroundColor: '#fff',
                overflow: 'hidden',
                marginBottom: 12,
            }}
        >
            {suggestion.photo_url ? (
                <Image source={{ uri: suggestion.photo_url }} contentFit="cover" style={{ width: '100%', height: 150 }} />
            ) : (
                <View style={{ width: '100%', height: 150, backgroundColor: '#e2e8f0' }} />
            )}

            <View style={{ padding: 12, gap: 8 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }} numberOfLines={2}>
                    {suggestion.title_ar}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#334155', fontWeight: '600', fontSize: 13 }}>
                        {Math.round(suggestion.ingredient_coverage * 100)}% {t('smartCooker.card.coverage')}
                    </Text>
                    <Text style={{ color: '#334155', fontWeight: '600', fontSize: 13 }}>
                        {t('smartCooker.card.matchScore')}: {Math.round(suggestion.match_score * 100)}
                    </Text>
                </View>

                <IngredientCoverageBar coverage={suggestion.ingredient_coverage} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Flame size={14} color="#f97316" />
                        <Text style={{ color: '#334155', fontWeight: '600' }}>{suggestion.estimated_nutrition.calories} kcal</Text>
                    </View>
                    {suggestion.prep_time_minutes ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Clock3 size={14} color="#0f766e" />
                            <Text style={{ color: '#334155', fontWeight: '600' }}>
                                {suggestion.prep_time_minutes} {t('smartCooker.card.minutes')}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Text style={{ color: '#334155', fontWeight: '600', fontSize: 12 }}>
                        {t('smartCooker.card.protein')}: {Math.round(suggestion.estimated_nutrition.protein)}g
                    </Text>
                    <Text style={{ color: '#334155', fontWeight: '600', fontSize: 12 }}>
                        {t('smartCooker.card.carbs')}: {Math.round(suggestion.estimated_nutrition.carbs)}g
                    </Text>
                    <Text style={{ color: '#334155', fontWeight: '600', fontSize: 12 }}>
                        {t('smartCooker.card.fats')}: {Math.round(suggestion.estimated_nutrition.fats)}g
                    </Text>
                </View>

                <View
                    style={{
                        alignSelf: 'flex-start',
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        backgroundColor: '#f8fafc',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                    }}
                >
                    <Text style={{ color: '#334155', fontSize: 11, fontWeight: '700' }}>
                        {t(`smartCooker.card.confidence.${confidenceKey}`)}
                    </Text>
                </View>

                <DietFitBadge label={suggestion.diet_fit_label} />

                {suggestion.missing_ingredients.length > 0 ? (
                    <View style={{ gap: 6 }}>
                        <Text style={{ color: '#7c2d12', fontWeight: '700', fontSize: 12 }}>
                            {t('smartCooker.card.missingCount', { count: suggestion.missing_ingredients.length })}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {suggestion.missing_ingredients.slice(0, 3).map((item) => (
                                <View
                                    key={`${suggestion.cookpad_id}-${item}`}
                                    style={{
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: '#fde68a',
                                        backgroundColor: '#fef9c3',
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                    }}
                                >
                                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#854d0e' }}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    <Text style={{ color: '#166534', fontWeight: '600', fontSize: 12 }}>
                        {t('smartCooker.card.noMissingIngredients')}
                    </Text>
                )}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                    <Pressable
                        onPress={() => onOpenRecipe?.(suggestion)}
                        disabled={!onOpenRecipe}
                        style={{
                            flex: 1,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#16a34a',
                            backgroundColor: '#f0fdf4',
                            paddingVertical: 9,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 6,
                            opacity: onOpenRecipe ? 1 : 0.65,
                        }}
                    >
                        <ExternalLink size={14} color="#166534" />
                        <Text style={{ color: '#166534', fontWeight: '700' }}>{t('smartCooker.actions.openRecipe')}</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => onPress(suggestion)}
                        style={{
                            flex: 1,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#cbd5e1',
                            backgroundColor: '#fff',
                            paddingVertical: 9,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 6,
                        }}
                    >
                        <Info size={14} color="#334155" />
                        <Text style={{ color: '#334155', fontWeight: '700' }}>{t('smartCooker.actions.viewDetails')}</Text>
                    </Pressable>
                </View>
            </View>
        </Pressable>
    );
}
