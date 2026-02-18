import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Star, Clock } from 'lucide-react-native';
import {
    getAllMealTemplates,
    loadTemplateAsMeal,
} from '../../services/api/mealTemplates';
import { useUIStore } from '../../store/uiStore';
import MealTemplate from '../../database/models/MealTemplate';

export default function LoadTemplateModal() {
    const router = useRouter();
    const showToast = useUIStore((state) => state.showToast);
    const [templates, setTemplates] = useState<MealTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMealType, setSelectedMealType] = useState<
        'breakfast' | 'lunch' | 'dinner' | 'snack'
    >('breakfast');

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const allTemplates = await getAllMealTemplates();
            setTemplates(allTemplates);
        } catch (error) {
            showToast('error', 'Failed to load meal templates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadTemplate = async (template: MealTemplate) => {
        try {
            await loadTemplateAsMeal(template.id);
            showToast('success', `${template.name} added to your meals`);
            router.back();
        } catch (error) {
            showToast('error', 'Failed to load template');
        }
    };

    const mealTypeButtons = [
        { type: 'breakfast', label: 'Breakfast' },
        { type: 'lunch', label: 'Lunch' },
        { type: 'dinner', label: 'Dinner' },
        { type: 'snack', label: 'Snack' },
    ] as const;

    const filteredTemplates = templates.filter(
        (t) => t.mealType === selectedMealType
    );

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="bg-primary-600 px-6 pt-12 pb-6">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-2xl font-bold text-white">
                        Load Meal Template
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="bg-white/20 p-2 rounded-full"
                    >
                        <X size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <Text className="text-white/80 text-sm">
                    Quickly log your favorite meals
                </Text>
            </View>

            {/* Meal Type Filter */}
            <View className="px-6 py-4 bg-neutral-50">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row gap-2"
                >
                    {mealTypeButtons.map((btn) => (
                        <TouchableOpacity
                            key={btn.type}
                            onPress={() => setSelectedMealType(btn.type)}
                            className={`px-4 py-2 rounded-full ${selectedMealType === btn.type
                                    ? 'bg-primary-600'
                                    : 'bg-white border border-neutral-200'
                                }`}
                        >
                            <Text
                                className={`font-semibold ${selectedMealType === btn.type
                                        ? 'text-white'
                                        : 'text-neutral-700'
                                    }`}
                            >
                                {btn.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Templates List */}
            <ScrollView className="flex-1 px-6 py-4">
                {isLoading ? (
                    <View className="items-center justify-center py-12">
                        <ActivityIndicator size="large" color="#10b981" />
                    </View>
                ) : filteredTemplates.length === 0 ? (
                    <View className="items-center justify-center py-12">
                        <Text className="text-neutral-500 text-center">
                            No templates for {selectedMealType} yet.{'\n'}
                            Save a meal as a template to see it here!
                        </Text>
                    </View>
                ) : (
                    <View className="space-y-3">
                        {filteredTemplates.map((template) => (
                            <TouchableOpacity
                                key={template.id}
                                onPress={() => handleLoadTemplate(template)}
                                className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm active:opacity-70"
                            >
                                <View className="flex-row justify-between items-start mb-2">
                                    <View className="flex-1">
                                        <View className="flex-row items-center">
                                            {template.isFavorite && (
                                                <Star
                                                    size={16}
                                                    color="#f59e0b"
                                                    fill="#f59e0b"
                                                    style={{ marginRight: 4 }}
                                                />
                                            )}
                                            <Text className="text-lg font-bold text-neutral-900">
                                                {template.name}
                                            </Text>
                                        </View>
                                        {template.description && (
                                            <Text className="text-neutral-600 text-sm mt-1">
                                                {template.description}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Nutrition Summary */}
                                <View className="flex-row justify-between mt-3 pt-3 border-t border-neutral-100">
                                    <View className="items-center">
                                        <Text className="text-neutral-500 text-xs mb-1">
                                            Calories
                                        </Text>
                                        <Text className="text-neutral-900 font-bold">
                                            {Math.round(template.totalCalories)}
                                        </Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-neutral-500 text-xs mb-1">
                                            Protein
                                        </Text>
                                        <Text className="text-blue-600 font-bold">
                                            {Math.round(template.totalProtein)}g
                                        </Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-neutral-500 text-xs mb-1">
                                            Carbs
                                        </Text>
                                        <Text className="text-orange-600 font-bold">
                                            {Math.round(template.totalCarbs)}g
                                        </Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-neutral-500 text-xs mb-1">
                                            Fats
                                        </Text>
                                        <Text className="text-purple-600 font-bold">
                                            {Math.round(template.totalFats)}g
                                        </Text>
                                    </View>
                                </View>

                                {/* Usage Count */}
                                <View className="flex-row items-center mt-3 pt-3 border-t border-neutral-100">
                                    <Clock size={14} color="#a3a3a3" />
                                    <Text className="text-neutral-400 text-xs ml-1">
                                        Used {template.useCount} times
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
