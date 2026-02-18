import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { useEffect, useState } from 'react';
import Exercise from '../../database/models/Exercise';

export const useExercises = () => {
    const database = useDatabase();
    const [exercises, setExercises] = useState<Exercise[]>([]);

    useEffect(() => {
        const exercisesCollection = database.get<Exercise>('exercises');
        const query = exercisesCollection.query(
            Q.sortBy('name', Q.asc)
        );

        const subscription = query.observe().subscribe(setExercises);

        return () => subscription.unsubscribe();
    }, [database]);

    return { exercises };
};
