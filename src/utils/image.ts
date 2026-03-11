/**
 * Formats a base64 string for usage with AI APIs.
 * Removes the data:image/jpeg;base64, prefix if present, or ensures it's clean suitable for JSON payloads.
 * @param base64 The raw base64 string from image picker
 * @returns Clean base64 string
 */
export const formatImageForAI = (base64: string | null | undefined): string | null => {
    if (!base64) return null;
    // The local backend proxy expects the data URI prefix
    if (base64.startsWith('data:image')) {
        return base64;
    }
    return `data:image/jpeg;base64,${base64}`;
};
