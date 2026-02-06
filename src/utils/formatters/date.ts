import { format, formatDistance, formatRelative, isToday, isYesterday, parseISO } from 'date-fns';

/**
 * Format a timestamp to a readable date string
 * @param timestamp - Unix timestamp in milliseconds
 * @param formatStr - Date format string (default: 'MMM dd, yyyy')
 * @returns Formatted date string
 */
export function formatDate(timestamp: number, formatStr: string = 'MMM dd, yyyy'): string {
    return format(new Date(timestamp), formatStr);
}

/**
 * Format a timestamp to a readable time string
 * @param timestamp - Unix timestamp in milliseconds
 * @param use24Hour - Whether to use 24-hour format (default: false)
 * @returns Formatted time string
 */
export function formatTime(timestamp: number, use24Hour: boolean = false): string {
    const formatStr = use24Hour ? 'HH:mm' : 'h:mm a';
    return format(new Date(timestamp), formatStr);
}

/**
 * Format a timestamp to a readable date and time string
 * @param timestamp - Unix timestamp in milliseconds
 * @param use24Hour - Whether to use 24-hour format (default: false)
 * @returns Formatted date and time string
 */
export function formatDateTime(timestamp: number, use24Hour: boolean = false): string {
    const timeFormat = use24Hour ? 'HH:mm' : 'h:mm a';
    return format(new Date(timestamp), `MMM dd, yyyy 'at' ${timeFormat}`);
}

/**
 * Format a timestamp to a relative time string (e.g., "2 hours ago")
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: number): string {
    return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
}

/**
 * Format a timestamp to a smart date string
 * - "Today at 3:30 PM" for today
 * - "Yesterday at 3:30 PM" for yesterday
 * - "Mon, Jan 15" for this week
 * - "Jan 15, 2024" for older dates
 * @param timestamp - Unix timestamp in milliseconds
 * @param use24Hour - Whether to use 24-hour format (default: false)
 * @returns Smart formatted date string
 */
export function formatSmartDate(timestamp: number, use24Hour: boolean = false): string {
    const date = new Date(timestamp);
    const timeFormat = use24Hour ? 'HH:mm' : 'h:mm a';

    if (isToday(date)) {
        return `Today at ${format(date, timeFormat)}`;
    }

    if (isYesterday(date)) {
        return `Yesterday at ${format(date, timeFormat)}`;
    }

    // Within the last week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (date > weekAgo) {
        return format(date, `EEE, MMM dd`);
    }

    // Older dates
    const currentYear = new Date().getFullYear();
    const dateYear = date.getFullYear();

    if (currentYear === dateYear) {
        return format(date, 'MMM dd');
    }

    return format(date, 'MMM dd, yyyy');
}

/**
 * Format a meal consumption time to a friendly string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted meal time string
 */
export function formatMealTime(timestamp: number): string {
    const date = new Date(timestamp);

    if (isToday(date)) {
        return format(date, 'h:mm a');
    }

    if (isYesterday(date)) {
        return 'Yesterday';
    }

    return format(date, 'MMM dd');
}

/**
 * Get the start of day timestamp
 * @param date - Optional date (defaults to today)
 * @returns Start of day timestamp in milliseconds
 */
export function getStartOfDay(date: Date = new Date()): number {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
}

/**
 * Get the end of day timestamp
 * @param date - Optional date (defaults to today)
 * @returns End of day timestamp in milliseconds
 */
export function getEndOfDay(date: Date = new Date()): number {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
}

/**
 * Get a timestamp for X days ago
 * @param days - Number of days ago
 * @returns Timestamp in milliseconds
 */
export function getDaysAgo(days: number): number {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.getTime();
}

/**
 * Get a timestamp for X days from now
 * @param days - Number of days from now
 * @returns Timestamp in milliseconds
 */
export function getDaysFromNow(days: number): number {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.getTime();
}

/**
 * Check if two timestamps are on the same day
 * @param timestamp1 - First timestamp
 * @param timestamp2 - Second timestamp
 * @returns True if same day, false otherwise
 */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);

    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

/**
 * Format a duration in minutes to a readable string
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "1h 30m", "45m")
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${mins}m`;
}
