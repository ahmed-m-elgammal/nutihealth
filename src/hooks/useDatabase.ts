import { database } from '../database';

/**
 * Hook for accessing the WatermelonDB database
 * @returns Database instance
 */
export function useDatabase() {
    return database;
}

/**
 * Get a specific collection from the database
 * @param tableName - Name of the table/collection
 * @returns Collection instance
 */
export function useCollection<T>(tableName: string) {
    return database.get<T>(tableName);
}

export default useDatabase;
