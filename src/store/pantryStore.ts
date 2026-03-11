import { create } from 'zustand';
import type { PantryCategory } from '../services/api/pantry';

interface PantryStore {
    selectedCategory: PantryCategory;
    setCategory: (category: PantryCategory) => void;
    reset: () => void;
}

export const usePantryStore = create<PantryStore>((set) => ({
    selectedCategory: 'all',

    setCategory: (category: PantryCategory) => {
        set({ selectedCategory: category });
    },

    reset: () => {
        set({ selectedCategory: 'all' });
    },
}));

export default usePantryStore;
