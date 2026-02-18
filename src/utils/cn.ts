import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes with proper conflict resolution.
 * Combines clsx for conditional classes and tailwind-merge for deduplication.
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string
 * 
 * @example
 * cn('px-2 py-1', 'px-4') // Returns: 'py-1 px-4'
 * cn('text-red-500', condition && 'text-blue-500') // Returns based on condition
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
