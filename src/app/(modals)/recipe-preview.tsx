import React from 'react';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import RecipePreviewScreen from '../../screens/RecipeImport/RecipePreviewScreen';

export default function RecipePreviewRoute() {
    return (
        <ErrorBoundary
            fallbackTitle="Recipe Preview Error"
            fallbackMessage="The recipe preview encountered an error. Retry to reload it."
        >
            <RecipePreviewScreen />
        </ErrorBoundary>
    );
}