import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Dumbbell, Zap, Calendar, List } from 'lucide-react-native';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { ALL_PROGRAMS } from '../../../data/programs';
import TrainingProgram from '../../../database/models/TrainingProgram';
import WorkoutTemplate from '../../../database/models/WorkoutTemplate';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { WorkoutDay } from '../../../types/workout';
import { applyTemplateScheduleForUser, getSchedulePreferencesFromUser } from '../../../services/workout/schedulePlanner';

export default function ProgramDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const database = useDatabase();
    const { user } = useCurrentUser();

    const program = ALL_PROGRAMS.find(p => p.id === id);

    if (!program) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <Text>Program not found</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4 p-2">
                    <Text className="text-indigo-600">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const weeklySetVolume = program.schedule.days.reduce(
        (sum, day) => sum + day.mainWorkout.reduce((daySum, exercise) => daySum + exercise.sets, 0),
        0
    );
    const averageSessionDuration = Math.round(
        program.schedule.days.reduce((sum, day) => sum + day.estimatedDuration, 0) / Math.max(1, program.schedule.days.length)
    );

    const activateProgram = async () => {
        if (!user?.id) {
            Alert.alert('No user found', 'Please complete onboarding before selecting a program.');
            return;
        }

        try {
            const trainingProgramsCollection = database.get<TrainingProgram>('training_programs');
            const templatesCollection = database.get<WorkoutTemplate>('workout_templates');

            const [programRecord] = await trainingProgramsCollection
                .query(Q.where('name', program.title))
                .fetch();

            if (!programRecord) {
                throw new Error('Program data has not been seeded yet. Please open Browse Programs first.');
            }

            const templates = await templatesCollection
                .query(
                    Q.where('program_id', programRecord.id),
                    Q.sortBy('created_at', Q.asc)
                )
                .fetch();

            if (templates.length === 0) {
                throw new Error('No templates were found for this program.');
            }

            const result = await applyTemplateScheduleForUser({
                database,
                user,
                templates,
                preferences: getSchedulePreferencesFromUser(user.workoutPreferences),
            });

            if (result.droppedTemplateIds.length > 0) {
                Alert.alert(
                    'Program applied with adjustments',
                    `${result.droppedTemplateIds.length} workout day(s) were skipped due to current rest-day settings.`
                );
            }

            router.dismissAll();
            router.replace('/(tabs)/workouts');
        } catch (error) {
            Alert.alert('Unable to start program', (error as Error).message || 'Please try again.');
        }
    };

    const handleStartProgram = () => {
        Alert.alert(
            'Start Program',
            `This will replace your current weekly schedule with "${program.title}". Are you sure?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start Program',
                    style: 'destructive',
                    onPress: () => void activateProgram(),
                }
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header Image Placeholder */}
                <View className="h-64 bg-neutral-100 items-center justify-center relative">
                    <Dumbbell size={64} color="#9CA3AF" />
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="absolute top-4 left-6 bg-white/80 p-2 rounded-full backdrop-blur-sm"
                    >
                        <ChevronLeft size={24} color="#171717" />
                    </TouchableOpacity>
                </View>

                <View className="px-6 py-6">
                    {/* Tags & Meta */}
                    <View className="flex-row flex-wrap mb-4">
                        <View className={`px-2 py-1 rounded mr-2 mb-2 ${program.level === 'beginner' ? 'bg-green-100' :
                            program.level === 'intermediate' ? 'bg-yellow-100' : 'bg-red-100'
                            }`}>
                            <Text className={`text-xs font-bold capitalize ${program.level === 'beginner' ? 'text-green-800' :
                                program.level === 'intermediate' ? 'text-yellow-800' : 'text-red-800'
                                }`}>{program.level}</Text>
                        </View>
                        {program.tags.map(tag => (
                            <View key={tag} className="bg-neutral-100 px-2 py-1 rounded mr-2 mb-2">
                                <Text className="text-neutral-500 text-xs">{tag}</Text>
                            </View>
                        ))}
                    </View>

                    <Text className="text-3xl font-bold text-neutral-900 mb-2">{program.title}</Text>
                    <Text className="text-neutral-500 leading-relaxed mb-6 text-base">
                        {program.description}
                    </Text>

                    {/* Stats Grid */}
                    <View className="flex-row justify-between mb-8 bg-neutral-50 p-4 rounded-2xl">
                        <View className="items-center flex-1">
                            <Calendar size={20} color="#4F46E5" className="mb-1" />
                            <Text className="text-neutral-900 font-bold">{program.durationWeeks} Weeks</Text>
                            <Text className="text-neutral-400 text-xs">Duration</Text>
                        </View>
                        <View className="w-[1px] bg-neutral-200" />
                        <View className="items-center flex-1">
                            <Zap size={20} color="#4F46E5" className="mb-1" />
                            <Text className="text-neutral-900 font-bold">{program.daysPerWeek} Days</Text>
                            <Text className="text-neutral-400 text-xs">Per Week</Text>
                        </View>
                        <View className="w-[1px] bg-neutral-200" />
                        <View className="items-center flex-1">
                            <List size={20} color="#4F46E5" className="mb-1" />
                            <Text className="text-neutral-900 font-bold">{weeklySetVolume}</Text>
                            <Text className="text-neutral-400 text-xs">Sets/Week</Text>
                        </View>
                    </View>

                    <View className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
                        <Text className="text-indigo-900 font-semibold text-sm">
                            Avg Session: {averageSessionDuration} min • Equipment: {program.equipment.join(', ')}
                        </Text>
                    </View>

                    {/* Schedule Preview */}
                    <Text className="text-xl font-bold text-neutral-900 mb-4">Weekly Schedule</Text>
                    {program.schedule.days.map((day: WorkoutDay, index: number) => (
                        <View key={index} className="flex-row mb-4 items-start">
                            <View className="bg-indigo-100 w-8 h-8 rounded-full items-center justify-center mr-4 mt-1">
                                <Text className="text-indigo-600 font-bold text-xs">{index + 1}</Text>
                            </View>
                            <View className="flex-1 bg-white border border-neutral-100 p-4 rounded-xl shadow-sm">
                                <Text className="font-bold text-neutral-900 mb-1">{day.title}</Text>
                                <Text className="text-neutral-500 text-sm mb-2">{day.focus.join(', ')}</Text>
                                <View>
                                    {day.mainWorkout.slice(0, 4).map((exercise) => (
                                        <Text key={`${day.id}_${exercise.id}`} className="text-xs text-neutral-500 mb-1">
                                            • {exercise.name}: {exercise.sets} x {exercise.reps} {exercise.repType} ({exercise.restPeriod}s rest)
                                        </Text>
                                    ))}
                                    {day.mainWorkout.length > 4 ? (
                                        <Text className="text-xs text-neutral-400">+ {day.mainWorkout.length - 4} more exercises</Text>
                                    ) : null}
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Floating Action Button */}
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100">
                <TouchableOpacity
                    onPress={handleStartProgram}
                    className="bg-indigo-600 p-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-indigo-200"
                >
                    <Zap size={20} color="white" className="mr-2" />
                    <Text className="text-white font-bold text-lg">Start This Program</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
