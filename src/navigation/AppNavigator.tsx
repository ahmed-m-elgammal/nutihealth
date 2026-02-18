/**
 * Expo Router modal route constants.
 * This file acts as a navigation contract for modal entry points.
 */

export const AppNavigator = {
    modals: {
        addMeal: '/(modals)/add-meal',
        foodSearch: '/(modals)/food-search',
        barcodeScanner: '/(modals)/barcode-scanner',
        aiFoodDetect: '/(modals)/ai-food-detect',
        recipeImport: '/(modals)/recipe-import',
        recipePreview: '/(modals)/recipe-preview',
    },
} as const;

export type AppModalRoute = (typeof AppNavigator.modals)[keyof typeof AppNavigator.modals];

/**
 * Helper for strongly-typed navigation payload to recipe preview.
 */
export function buildRecipePreviewRoute(url: string) {
    return {
        pathname: AppNavigator.modals.recipePreview,
        params: { url },
    };
}

export default AppNavigator;