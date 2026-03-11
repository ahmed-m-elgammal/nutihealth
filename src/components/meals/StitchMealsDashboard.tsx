import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useMeals } from '../../query/queries/useMeals';
import { useUIStore } from '../../store/uiStore';
import { useMealActions } from '../../hooks/useMealActions';
import { DEFAULT_TARGETS } from '../../constants/nutritionDefaults';
import { database } from '../../database';
import Food from '../../database/models/Food';
import FoodItemCard from './FoodItemCard';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type FoodListItem = {
  id: string;
  mealId: string;
  mealName: string;
  mealType: MealType;
  consumedAt: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  quantity: number;
  servingUnit?: string;
  brand: string;
  note?: string;
};

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

const normalizeMealType = (value: string): MealType => {
  const normalized = value.toLowerCase();
  if (['breakfast', 'lunch', 'dinner', 'snack'].includes(normalized)) {
    return normalized as MealType;
  }
  return 'snack';
};

export default function MealsDashboard() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const showToast = useUIStore((state) => state.showToast);
  const [foodsForDay, setFoodsForDay] = useState<FoodListItem[]>([]);
  const [expanded, setExpanded] = useState<Record<MealType, boolean>>({
    breakfast: true,
    lunch: true,
    dinner: true,
    snack: true,
  });

  const today = useMemo(() => new Date(), []);
  const { data: meals = [], isLoading: isLoadingMeals } = useMeals(today, user?.id);
  const { handleDeleteFood, handleDuplicateFood, handleEditFood, handleAddNote } = useMealActions({ router, showToast });

  // Load foods for today from WatermelonDB (same pattern as original meals.tsx)
  useEffect(() => {
    let isActive = true;

    const loadFoods = async () => {
      if (!meals.length) {
        if (isActive) setFoodsForDay([]);
        return;
      }

      const mealIds = meals.map((meal) => meal.id);
      const mealMap = new Map(
        meals.map((meal) => [
          meal.id,
          {
            mealName: meal.name,
            mealType: normalizeMealType(meal.mealType || 'snack'),
            consumedAt: meal.consumedAt,
          },
        ]),
      );

      const foods = await database
        .get<Food>('foods')
        .query(Q.where('meal_id', Q.oneOf(mealIds)))
        .fetch();

      const flattenedFoods = foods
        .map<FoodListItem | null>((food) => {
          const mealDetails = mealMap.get(food.mealId);
          if (!mealDetails) return null;
          return {
            id: food.id,
            mealId: food.mealId,
            mealName: mealDetails.mealName,
            mealType: mealDetails.mealType,
            consumedAt: mealDetails.consumedAt,
            name: food.name,
            calories: food.calories * food.quantity,
            protein: food.protein * food.quantity,
            carbs: food.carbs * food.quantity,
            fats: food.fats * food.quantity,
            quantity: food.quantity,
            servingUnit: food.servingUnit,
            brand: food.brand || 'Logged food',
            note: food.note,
          };
        })
        .filter((food): food is FoodListItem => Boolean(food));

      if (isActive) {
        setFoodsForDay(flattenedFoods.sort((a, b) => b.consumedAt - a.consumedAt));
      }
    };

    loadFoods().catch(() => {
      if (isActive) setFoodsForDay([]);
    });

    return () => { isActive = false; };
  }, [meals]);

  // Aggregate totals
  const nutrition = useMemo(
    () =>
      foodsForDay.reduce(
        (acc, food) => {
          acc.calories += food.calories;
          acc.protein += food.protein;
          acc.carbs += food.carbs;
          acc.fats += food.fats;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fats: 0 },
      ),
    [foodsForDay],
  );

  const grouped = useMemo(() => {
    const init: Record<MealType, FoodListItem[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    foodsForDay.forEach((food) => { if (init[food.mealType]) init[food.mealType].push(food); });
    return init;
  }, [foodsForDay]);

  const calorieGoal = user?.calorieTarget || DEFAULT_TARGETS.calories;
  const calorieProgress = calorieGoal > 0 ? Math.min(1, nutrition.calories / calorieGoal) : 0;

  const toggleExpanded = useCallback((type: MealType) => {
    setExpanded((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 28 }}>
          <View>
            <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '500' }}>Today</Text>
            <Text style={{ color: '#f8fafc', fontSize: 28, fontWeight: '700', marginTop: 2, letterSpacing: -0.5 }}>Meals</Text>
          </View>
        </View>

        {/* Calorie Ring + Macros Card */}
        <View style={{ backgroundColor: '#1e293b', borderRadius: 24, padding: 24, marginBottom: 28 }}>
          <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 20 }}>Daily Calories</Text>

          {isLoadingMeals ? (
            <ActivityIndicator color="#10b981" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Ring Placeholder */}
              <View style={{ alignItems: 'center' }}>
                <View style={{ height: 120, width: 120, borderRadius: 60, borderWidth: 10, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' }}>
                  <View style={{
                    position: 'absolute', height: 120, width: 120, borderRadius: 60,
                    borderWidth: 10, borderColor: '#10b981',
                    borderRightColor: 'transparent',
                    borderBottomColor: calorieProgress > 0.5 ? '#10b981' : 'transparent',
                    transform: [{ rotate: `${calorieProgress * 360}deg` }],
                  }} />
                  <Text style={{ color: '#10b981', fontSize: 20, fontWeight: '700' }}>{Math.round(nutrition.calories)}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>/ {calorieGoal} kcal</Text>
                </View>
              </View>

              {/* Macros */}
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>Protein</Text>
                  <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '700' }}>{Math.round(nutrition.protein)}g</Text>
                </View>
                <View>
                  <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>Carbs</Text>
                  <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '700' }}>{Math.round(nutrition.carbs)}g</Text>
                </View>
                <View>
                  <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>Fats</Text>
                  <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '700' }}>{Math.round(nutrition.fats)}g</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Meal Groups */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '700' }}>Today's Meals</Text>
        </View>

        {isLoadingMeals ? (
          <ActivityIndicator color="#10b981" style={{ marginTop: 24 }} />
        ) : (
          <View style={{ gap: 12 }}>
            {MEAL_TYPES.map((mealType) => {
              const items = grouped[mealType];
              const mealCalories = Math.round(items.reduce((sum, f) => sum + f.calories, 0));
              const isOpen = expanded[mealType];
              return (
                <View key={mealType} style={{ backgroundColor: '#1e293b', borderRadius: 20, overflow: 'hidden' }}>
                  {/* Meal Header */}
                  <Pressable
                    onPress={() => toggleExpanded(mealType)}
                    android_ripple={{ color: 'rgba(16,185,129,0.1)' }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}
                  >
                    <View>
                      <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 15, textTransform: 'capitalize' }}>
                        {MEAL_LABELS[mealType]}
                      </Text>
                      <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                        {items.length === 0 ? 'Not logged yet' : `${items.length} item${items.length > 1 ? 's' : ''} · ${mealCalories} kcal`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {mealCalories > 0 && (
                        <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 14 }}>{mealCalories} kcal</Text>
                      )}
                      {isOpen ? <ChevronUp color="#94a3b8" size={18} /> : <ChevronDown color="#94a3b8" size={18} />}
                    </View>
                  </Pressable>

                  {/* Food Items */}
                  {isOpen && items.length > 0 && (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 6 }}>
                      {items.map((food) => (
                        <FoodItemCard
                          key={food.id}
                          item={food}
                          onPress={() => handleEditFood(food)}
                          onDelete={() => handleDeleteFood(food)}
                          onDuplicate={() => handleDuplicateFood(food)}
                          onEdit={() => handleEditFood(food)}
                          onAddNote={() => handleAddNote(food)}
                        />
                      ))}
                    </View>
                  )}

                  {/* Add to this meal */}
                  {isOpen && (
                    <TouchableOpacity
                      onPress={() => router.push('/(modals)/add-meal')}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: items.length > 0 ? 1 : 0, borderTopColor: '#334155' }}
                      activeOpacity={0.7}
                    >
                      <Plus color="#10b981" size={16} />
                      <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>Add food</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => router.push('/(modals)/add-meal')}
        style={{ position: 'absolute', bottom: 24, right: 24, height: 64, width: 64, backgroundColor: '#10b981', borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}
        activeOpacity={0.85}
      >
        <Plus color="#ffffff" size={32} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
