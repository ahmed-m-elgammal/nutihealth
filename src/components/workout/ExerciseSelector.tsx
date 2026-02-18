import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Search, X, ChevronRight } from 'lucide-react-native';
import { database } from '../../database';
import { Q } from '@nozbe/watermelondb';
import Exercise from '../../database/models/Exercise';
import { Skeleton } from '../ui/Skeleton';
import { Image as ExpoImage } from 'expo-image';

interface ExerciseSelectorProps {
    onSelect: (exercise: Exercise) => void;
    onClose: () => void;
}

export function ExerciseSelector({ onSelect, onClose }: ExerciseSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

    const fetchExercises = useCallback(async (query: string, category: string | null) => {
        setIsLoading(true);
        try {
            const exercisesCollection = database.get<Exercise>('exercises');
            let queryBuilder = exercisesCollection.query();

            const conditions = [];

            if (query.trim().length > 0) {
                // Case-insensitive search on name
                // Note: WatermelonDB's like syntax depends on the adapter, but typically:
                conditions.push(Q.where('name', Q.like(`%${Q.sanitizeLikeString(query)}%`)));
            }

            if (category) {
                conditions.push(Q.where('muscle_group', category));
            }

            // Apply conditions and limit
            queryBuilder = exercisesCollection.query(
                ...conditions,
                Q.take(50) // Limit results for performance
            );

            const results = await queryBuilder.fetch();
            setExercises(results);
        } catch (error) {
            console.error('Error searching exercises:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchExercises(searchQuery, categoryFilter);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, categoryFilter, fetchExercises]);

    const renderItem = ({ item }: { item: Exercise }) => (
        <TouchableOpacity
            className="flex-row items-center p-3 border-b border-neutral-100 bg-white active:bg-neutral-50"
            onPress={() => onSelect(item)}
        >
            <View className="w-16 h-16 bg-neutral-100 rounded-lg overflow-hidden mr-4 border border-neutral-200">
                {item.imageUrl ? (
                    <ExpoImage
                        source={{ uri: item.imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                    />
                ) : (
                    <View className="w-full h-full items-center justify-center">
                        <Text className="text-xl">💪</Text>
                    </View>
                )}
            </View>
            <View className="flex-1">
                <Text className="font-bold text-neutral-900 text-base">{item.name}</Text>
                <View className="flex-row mt-1">
                    <View className="bg-primary-50 px-2 py-0.5 rounded text-xs mr-2">
                        <Text className="text-primary-700 text-xs capitalize">{item.muscleGroup?.replace('_', ' ') || 'General'}</Text>
                    </View>
                    <View className="bg-neutral-100 px-2 py-0.5 rounded text-xs">
                        <Text className="text-neutral-500 text-xs capitalize">{item.equipment || 'No Equipment'}</Text>
                    </View>
                </View>
            </View>
            <ChevronRight size={20} color="#d4d4d4" />
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="px-4 py-3 border-b border-neutral-100 flex-row items-center gap-3">
                <View className="flex-1 flex-row items-center bg-neutral-100 rounded-xl px-3 h-10">
                    <Search size={20} color="#737373" />
                    <TextInput
                        className="flex-1 ml-2 text-base text-neutral-900 h-full"
                        placeholder="Search exercises..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={18} color="#a3a3a3" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity onPress={onClose} className="p-2">
                    <Text className="text-primary-600 font-semibold">Cancel</Text>
                </TouchableOpacity>
            </View>

            {/* Quick Filters - could be expanded */}
            <View className="px-4 py-2 border-b border-neutral-50">
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={['All', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio']}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => setCategoryFilter(item === 'All' ? null : item)}
                            className={`mr-2 px-3 py-1.5 rounded-full border ${(item === 'All' && !categoryFilter) || categoryFilter === item
                                    ? 'bg-primary-600 border-primary-600'
                                    : 'bg-white border-neutral-200'
                                }`}
                        >
                            <Text
                                className={`text-xs font-semibold capitalize ${(item === 'All' && !categoryFilter) || categoryFilter === item
                                        ? 'text-white'
                                        : 'text-neutral-600'
                                    }`}
                            >
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* List */}
            {isLoading && exercises.length === 0 ? (
                <View className="p-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <View key={i} className="flex-row items-center mb-4">
                            <Skeleton className="w-16 h-16 rounded-lg mr-4" />
                            <View className="flex-1">
                                <Skeleton className="w-3/4 h-5 mb-2 rounded" />
                                <Skeleton className="w-1/2 h-4 rounded" />
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={exercises}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-10">
                            <Text className="text-neutral-400 text-center">No exercises found</Text>
                            <Text className="text-neutral-400 text-xs text-center mt-1">Try a different search term</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
