import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { useEffect, useState } from 'react';
import Workout from '../../database/models/Workout';

export const useWorkouts = () => {
    const database = useDatabase();
    const [workouts, setWorkouts] = useState<Workout[]>([]);

    useEffect(() => {
        const workoutsCollection = database.get<Workout>('workouts');
        const query = workoutsCollection.query(
            Q.sortBy('created_at', Q.desc)
        );

        const subscription = query.observe().subscribe(setWorkouts);

        return () => subscription.unsubscribe();
    }, [database]);

    return { workouts };
};

export const useWorkout = (id: string) => {
    const database = useDatabase();
    const [workout, setWorkout] = useState<Workout | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }

        const fetchWorkout = async () => {
            try {
                const w = await database.get<Workout>('workouts').find(id);
                setWorkout(w);
            } catch (error) {
                console.log('Error fetching workout', error);
                setWorkout(null);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkout();
    }, [database, id]);

    return { workout, loading };
};
