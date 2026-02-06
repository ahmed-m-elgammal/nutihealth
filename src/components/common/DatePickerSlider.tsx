import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns';

interface DatePickerSliderProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
}

export default function DatePickerSlider({ selectedDate, onDateChange }: DatePickerSliderProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(selectedDate));

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

    const goToPreviousWeek = () => {
        setCurrentWeekStart(subDays(currentWeekStart, 7));
    };

    const goToNextWeek = () => {
        setCurrentWeekStart(addDays(currentWeekStart, 7));
    };

    return (
        <View className="bg-gray-50 rounded-lg p-3 mb-3">
            <View className="flex-row items-center justify-between mb-2">
                <TouchableOpacity onPress={goToPreviousWeek} className="p-2">
                    <ChevronLeft size={20} color="#6B7280" />
                </TouchableOpacity>
                <Text className="text-sm font-semibold text-gray-700">
                    {format(currentWeekStart, 'MMM yyyy')}
                </Text>
                <TouchableOpacity onPress={goToNextWeek} className="p-2">
                    <ChevronRight size={20} color="#6B7280" />
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row space-x-2">
                    {weekDays.map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <TouchableOpacity
                                key={day.toISOString()}
                                onPress={() => onDateChange(day)}
                                className={`items-center justify-center rounded-lg p-2 min-w-[50px] ${isSelected
                                        ? 'bg-primary-500'
                                        : isToday
                                            ? 'bg-primary-100'
                                            : 'bg-white'
                                    }`}
                            >
                                <Text
                                    className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-500'
                                        }`}
                                >
                                    {format(day, 'EEE')}
                                </Text>
                                <Text
                                    className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'
                                        }`}
                                >
                                    {format(day, 'd')}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}
