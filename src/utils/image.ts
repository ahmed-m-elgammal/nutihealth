/**
 * Formats a base64 string for usage with AI APIs.
 * Removes the data:image/jpeg;base64, prefix if present, or ensures it's clean suitable for JSON payloads.
 * @param base64 The raw base64 string from image picker
 * @returns Clean base64 string
 */
export const formatImageForAI = (base64: string | null | undefined): string | null => {
    if (!base64) return null;
    // If it already has the prefix, we might want to keep it or strip it depending on API.
    // Hugging Face Inference API via JSON usually expects the base64 string directly in 'inputs'.
    // Some implementations prefer data URI. We'll start with raw base64.
    return base64.replace(/^data:image\/\w+;base64,/, "");
};
