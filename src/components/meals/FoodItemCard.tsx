import React, { useRef } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Copy, Pencil, StickyNote, Trash2 } from 'lucide-react-native';
import { triggerHaptic } from '../../utils/haptics';

type FoodItem = {
    id: string;
    name: string;
    brand?: string;
    quantity?: number;
    calories: number;
    protein?: number;
    carbs?: number;
    fats?: number;
};

type FoodItemCardProps = {
    item: FoodItem;
    transitionId?: string;
    onPress: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onEdit: () => void;
    onAddNote: () => void;
};

export default function FoodItemCard({
    item,
    transitionId,
    onPress,
    onDelete,
    onDuplicate,
    onEdit,
    onAddNote,
}: FoodItemCardProps) {
    const swipeableRef = useRef<Swipeable>(null);

    return (
        <Animated.View sharedTransitionTag={transitionId}>
            <Swipeable
                ref={swipeableRef}
                friction={2}
                leftThreshold={60}
                rightThreshold={60}
                overshootLeft={false}
                overshootRight={false}
                onSwipeableOpen={(direction) => {
                    swipeableRef.current?.close();
                    if (direction === 'left') {
                        triggerHaptic('medium').catch(() => undefined);
                        onDelete();
                    } else {
                        triggerHaptic('light').catch(() => undefined);
                        onDuplicate();
                    }
                }}
                renderLeftActions={() => (
                    <View
                        style={{
                            justifyContent: 'center',
                            alignItems: 'flex-start',
                            borderRadius: 12,
                            backgroundColor: '#fef2f2',
                            marginBottom: 2,
                            paddingHorizontal: 14,
                        }}
                    >
                        <Trash2 size={16} color="#dc2626" />
                    </View>
                )}
                renderRightActions={() => (
                    <View
                        style={{
                            justifyContent: 'center',
                            alignItems: 'flex-end',
                            borderRadius: 12,
                            backgroundColor: '#ecfdf5',
                            marginBottom: 2,
                            paddingHorizontal: 14,
                        }}
                    >
                        <Copy size={16} color="#059669" />
                    </View>
                )}
            >
                <Pressable
                    onPress={onPress}
                    onLongPress={() => {
                        triggerHaptic('light').catch(() => undefined);
                        Alert.alert(item.name, 'Quick actions', [
                            { text: 'Edit', onPress: onEdit },
                            { text: 'Duplicate', onPress: onDuplicate },
                            { text: 'Add Note', onPress: onAddNote },
                            { text: 'Delete', style: 'destructive', onPress: onDelete },
                            { text: 'Cancel', style: 'cancel' },
                        ]);
                    }}
                    android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
                    style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                        backgroundColor: '#fff',
                        padding: 12,
                        overflow: 'hidden',
                    }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ fontWeight: '700', color: '#0f172a' }}>{item.name}</Text>
                            {item.brand ? (
                                <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{item.brand}</Text>
                            ) : null}
                            <Text style={{ color: '#334155', fontSize: 12, marginTop: 6 }}>
                                {Math.round(item.quantity || 1)} serving • {Math.round(item.calories)} kcal
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable
                                onPress={() => {
                                    triggerHaptic('light').catch(() => undefined);
                                    onEdit();
                                }}
                                android_ripple={{ color: '#e0e7ff' }}
                                style={{
                                    borderRadius: 999,
                                    padding: 8,
                                    backgroundColor: '#eef2ff',
                                    overflow: 'hidden',
                                }}
                            >
                                <Pencil size={14} color="#4f46e5" />
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    triggerHaptic('light').catch(() => undefined);
                                    onAddNote();
                                }}
                                android_ripple={{ color: '#f3f4f6' }}
                                style={{
                                    borderRadius: 999,
                                    padding: 8,
                                    backgroundColor: '#f8fafc',
                                    overflow: 'hidden',
                                }}
                            >
                                <StickyNote size={14} color="#334155" />
                            </Pressable>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                        <Text style={{ fontSize: 11, color: '#2563eb' }}>P {Math.round(item.protein || 0)}g</Text>
                        <Text style={{ fontSize: 11, color: '#d97706' }}>C {Math.round(item.carbs || 0)}g</Text>
                        <Text style={{ fontSize: 11, color: '#db2777' }}>F {Math.round(item.fats || 0)}g</Text>
                    </View>
                </Pressable>
            </Swipeable>
        </Animated.View>
    );
}
