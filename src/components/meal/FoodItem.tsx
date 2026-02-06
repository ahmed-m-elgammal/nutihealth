import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Trash2, Minus, Plus } from 'lucide-react-native';
import type { FoodData } from '@services/api/meals';

interface FoodItemProps {
    food: FoodData;
    onRemove: () => void;
    onUpdateQuantity: (quantity: number) => void;
}

export default function FoodItem({ food, onRemove, onUpdateQuantity }: FoodItemProps) {
    const [quantity, setQuantity] = useState(food.quantity.toString());

    const handleQuantityChange = (value: string) => {
        setQuantity(value);
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue > 0) {
            onUpdateQuantity(numValue);
        }
    };

    const incrementQuantity = () => {
        const newQuantity = food.quantity + 1;
        setQuantity(newQuantity.toString());
        onUpdateQuantity(newQuantity);
    };

    const decrementQuantity = () => {
        const newQuantity = Math.max(0.5, food.quantity - 1);
        setQuantity(newQuantity.toString());
        onUpdateQuantity(newQuantity);
    };

    const totalCalories = Math.round(food.calories * food.quantity);

    return (
        <View className="bg-gray-50 rounded-lg p-3 mb-2">
            <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900">{food.name}</Text>
                    {food.brand && (
                        <Text className="text-xs text-gray-500">{food.brand}</Text>
                    )}
                    <Text className="text-xs text-gray-500 mt-1">
                        {food.servingSize} {food.servingUnit} • {totalCalories} kcal
                    </Text>
                </View>
                <TouchableOpacity onPress={onRemove} className="p-1">
                    <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center bg-white rounded-lg border border-gray-200">
                    <TouchableOpacity
                        onPress={decrementQuantity}
                        className="p-2"
                    >
                        <Minus size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TextInput
                        value={quantity}
                        onChangeText={handleQuantityChange}
                        keyboardType="numeric"
                        className="px-2 text-center text-sm font-medium text-gray-900 min-w-[40px]"
                    />
                    <TouchableOpacity
                        onPress={incrementQuantity}
                        className="p-2"
                    >
                        <Plus size={16} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <View className="flex-row space-x-3">
                    <View>
                        <Text className="text-xs text-gray-500">Protein</Text>
                        <Text className="text-sm font-medium text-green-600">
                            {Math.round(food.protein * food.quantity)}g
                        </Text>
                    </View>
                    <View>
                        <Text className="text-xs text-gray-500">Carbs</Text>
                        <Text className="text-sm font-medium text-blue-600">
                            {Math.round(food.carbs * food.quantity)}g
                        </Text>
                    </View>
                    <View>
                        <Text className="text-xs text-gray-500">Fats</Text>
                        <Text className="text-sm font-medium text-orange-600">
                            {Math.round(food.fats * food.quantity)}g
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}
