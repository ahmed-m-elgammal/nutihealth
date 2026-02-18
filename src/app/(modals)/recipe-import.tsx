import React from 'react';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import RecipeImportScreen from '../../screens/RecipeImport/RecipeImportScreen';

export default function RecipeImportRoute() {
    return (
        <ErrorBoundary
            fallbackTitle="Recipe Import Error"
            fallbackMessage="The import flow crashed unexpectedly. Retry to continue."
        >
            <RecipeImportScreen />
        </ErrorBoundary>
    );
}