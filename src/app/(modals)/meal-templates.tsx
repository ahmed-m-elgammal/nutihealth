import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Star, Trash2, Search } from 'lucide-react-native';
import {
    getAllMealTemplates,
    deleteMealTemplate,
    toggleTemplateFavorite,
} from '../../services/api/mealTemplates';
import { useUIStore } from '../../store/uiStore';
import MealTemplate from '../../database/models/MealTemplate';

export default function MealTemplatesScreen() {
    const router = useRouter();
    const showToast = useUIStore((state) => state.showToast);
    const [templates, setTemplates] = useState<MealTemplate[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<MealTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredTemplates(templates);
        } else {
            const filtered = templates.filter((t) =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredTemplates(filtered);
        }
    }, [searchQuery, templates]);

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const allTemplates = await getAllMealTemplates();
            setTemplates(allTemplates);
            setFilteredTemplates(allTemplates);
        } catch (error) {
            showToast('error', 'Failed to load templates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTemplate = (template: MealTemplate) => {
        Alert.alert(
            'Delete Template',
            `Are you sure you want to delete "${template.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteMealTemplate(template.id);
                            showToast('success', 'Template deleted');
                            loadTemplates();
                        } catch (error) {
                            showToast('error', 'Failed to delete template');
                        }
                    },
                },
            ]
        );
    };

    const handleToggleFavorite = async (template: MealTemplate) => {
        try {
            await toggleTemplateFavorite(template.id);
            loadTemplates();
        } catch (error) {
            showToast('error', 'Failed to update template');
        }
    };

    const mealTypeColors = {
        breakfast: 'bg-amber-100 text-amber-800',
        lunch: 'bg-blue-100 text-blue-800',
        dinner: 'bg-purple-100 text-purple-800',
        snack: 'bg-green-100 text-green-800',
    };

    return (
        <View className="flex-1 bg-neutral-50">
            {/* Header */}
            <View className="bg-primary-600 px-6 pt-12 pb-6">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-2xl font-bold text-white">
                        Meal Templates
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="bg-white/20 p-2 rounded-full"
                    >
                        <X size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <Text className="text-white/80 text-sm">
                    Manage your saved meals
                </Text>
            </View>

            {/* Search Bar */}
            <View className="px-6 py-4 bg-white border-b border-neutral-100">
                <View className="flex-row items-center bg-neutral-100 rounded-xl px-4 py-3">
                    <Search size={20} color="#a3a3a3" />
                    <TextInput
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="flex-1 ml-3 text-neutral-900"
                        placeholderTextColor="#a3a3a3"
                    />
                </View>
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
                            {searchQuery
                                ? 'No templates match your search'
                                : 'No templates saved yet.\nSave your first meal to get started!'}
                        </Text>
                    </View>
                ) : (
                    <View className="space-y-3">
                        {filteredTemplates.map((template) => (
                            <View
                                key={template.id}
                                className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm"
                            >
                                {/* Header */}
                                <View className="flex-row justify-between items-start mb-3">
                                    <View className="flex-1">
                                        <View className="flex-row items-center mb-1">
                                            <Text className="text-lg font-bold text-neutral-900">
                                                {template.name}
                                            </Text>
                                        </View>
                                        <View
                                            className={`self-start px-2 py-1 rounded-full ${mealTypeColors[template.mealType]
                                                }`}
                                        >
                                            <Text className="text-xs font-semibold capitalize">
                                                {template.mealType}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Actions */}
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            onPress={() => handleToggleFavorite(template)}
                                            className="p-2"
                                        >
                                            <Star
                                                size={20}
                                                color={template.isFavorite ? '#f59e0b' : '#d4d4d4'}
                                                fill={template.isFavorite ? '#f59e0b' : 'transparent'}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteTemplate(template)}
                                            className="p-2"
                                        >
                                            <Trash2 size={20} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Nutrition */}
                                <View className="flex-row justify-between pt-3 border-t border-neutral-100">
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
                                <View className="mt-3 pt-3 border-t border-neutral-100">
                                    <Text className="text-neutral-400 text-xs">
                                        📊 Used {template.useCount} times • {template.foodsData.length} items
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
