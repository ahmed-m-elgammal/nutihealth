import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { Layout, FadeInDown } from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import FoodItemCard from './FoodItemCard';
import { triggerHaptic } from '../../utils/haptics';

type Food = {
    id: string;
    name: string;
    brand?: string;
    quantity?: number;
    calories: number;
    protein?: number;
    carbs?: number;
    fats?: number;
};

type CollapsibleMealSectionProps = {
    title: string;
    calories: number;
    foods: Food[];
    expanded: boolean;
    onToggle: () => void;
    onFoodPress: (food: Food) => void;
};

export default function CollapsibleMealSection({
    title,
    calories,
    foods,
    expanded,
    onToggle,
    onFoodPress,
}: CollapsibleMealSectionProps) {
    return (
        <Animated.View layout={Layout.springify()} style={{ marginTop: 12 }}>
            <Pressable
                onPress={() => {
                    triggerHaptic('light').catch(() => undefined);
                    onToggle();
                }}
                android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
                style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    backgroundColor: '#fff',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    overflow: 'hidden',
                }}
            >
                <View>
                    <Text style={{ fontWeight: '700', color: '#0f172a', textTransform: 'capitalize' }}>{title}</Text>
                    <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{Math.round(calories)} kcal</Text>
                </View>
                <ChevronDown
                    size={18}
                    color="#334155"
                    style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
                />
            </Pressable>

            {expanded ? (
                <Animated.View entering={FadeInDown.duration(250)} style={{ paddingTop: 8 }}>
                    {foods.length ? (
                        <FlashList
                            data={foods}
                            estimatedItemSize={86}
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <FoodItemCard
                                    item={item}
                                    transitionId={`food-card-${item.id}`}
                                    onPress={() => onFoodPress(item)}
                                    onDelete={() => {}}
                                    onDuplicate={() => {}}
                                />
                            )}
                        />
                    ) : (
                        <View
                            style={{
                                borderWidth: 1,
                                borderStyle: 'dashed',
                                borderColor: '#94a3b8',
                                borderRadius: 12,
                                padding: 14,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#475569' }}>No items yet. Add food to this meal.</Text>
                        </View>
                    )}
                </Animated.View>
            ) : null}
        </Animated.View>
    );
}
