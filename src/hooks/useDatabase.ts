import { database } from '../database';

/**
 * Hook for accessing the WatermelonDB database
 * @returns Database instance
 */
export function useDatabase() {
    return database;
}

export default useDatabase;
