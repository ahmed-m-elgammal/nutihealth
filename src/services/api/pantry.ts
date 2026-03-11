import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import PantryItem from '../../database/models/PantryItem';
import User from '../../database/models/User';
import { handleError } from '../../utils/errors';
import { getUserId } from '../../utils/storage';

export type PantryUnit = 'grams' | 'ml' | 'pieces' | 'cups' | 'tbsp' | 'tsp';
export type PantryCategory = 'all' | 'vegetables' | 'fruits' | 'proteins' | 'grains' | 'dairy' | 'spices' | 'other';

export interface AddPantryItemInput {
    name: string;
    quantity: number;
    unit: PantryUnit;
    category?: Exclude<PantryCategory, 'all'>;
    expiryDate?: number;
    userId?: string;
}

export interface PantryQueryOptions {
    userId?: string;
    category?: PantryCategory;
    includeUnavailable?: boolean;
}

const normalizePantryItemName = (name: string) =>
    name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

const resolveActiveUserId = async (): Promise<string> => {
    const usersCollection = database.get<User>('users');
    const users = await usersCollection.query().fetch();
    if (users.length === 0) {
        throw new Error('No user found. Please complete onboarding first.');
    }

    const storedUserId = await getUserId();
    if (storedUserId) {
        const matchedUser = users.find((user) => user.id === storedUserId);
        if (matchedUser) {
            return matchedUser.id;
        }
    }

    if (users.length === 1) {
        return users[0].id;
    }

    throw new Error('No active user selected. Please sign in again.');
};

export async function getPantryItems(options: PantryQueryOptions = {}): Promise<PantryItem[]> {
    try {
        const userId = options.userId || (await resolveActiveUserId());
        const conditions = [Q.where('user_id', Q.eq(userId)), Q.sortBy('created_at', Q.desc)];

        if (!options.includeUnavailable) {
            conditions.unshift(Q.where('is_available', true));
        }

        if (options.category && options.category !== 'all') {
            conditions.push(Q.where('category', Q.eq(options.category)));
        }

        return database.get<PantryItem>('pantry_items').query(...conditions).fetch();
    } catch (error) {
        handleError(error, 'pantry.getPantryItems');
        throw error;
    }
}

export async function addPantryItem(input: AddPantryItemInput): Promise<PantryItem> {
    try {
        const userId = input.userId || (await resolveActiveUserId());
        return database.write(async () => {
            return database.get<PantryItem>('pantry_items').create((record) => {
                record.userId = userId;
                record.name = input.name.trim();
                record.normalizedName = normalizePantryItemName(input.name);
                record.quantity = Number.isFinite(input.quantity) && input.quantity > 0 ? input.quantity : 1;
                record.unit = input.unit;
                record.category = input.category || 'other';
                record.expiryDate = input.expiryDate;
                record.isAvailable = true;
            });
        });
    } catch (error) {
        handleError(error, 'pantry.addPantryItem');
        throw error;
    }
}

export async function removePantryItem(itemId: string): Promise<void> {
    try {
        await markPantryItemsUsed([itemId]);
    } catch (error) {
        handleError(error, 'pantry.removePantryItem');
        throw error;
    }
}

export async function markPantryItemsUsed(itemIds: string[]): Promise<void> {
    try {
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return;
        }

        await database.write(async () => {
            for (const itemId of itemIds) {
                const record = await database.get<PantryItem>('pantry_items').find(itemId);
                await record.update((item) => {
                    item.isAvailable = false;
                });
            }
        });
    } catch (error) {
        handleError(error, 'pantry.markPantryItemsUsed');
        throw error;
    }
}
