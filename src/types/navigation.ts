// Navigation types for Expo Router

export type RootStackParamList = {
    '(tabs)': undefined;
    '(auth)/login': undefined;
    '(auth)/register': undefined;
    '(auth)/onboarding': undefined;
    '(modals)/add-meal': { date?: number };
    '(modals)/food-search': { mealId: string };
    '(modals)/barcode-scanner': { onScan: (barcode: string) => void };
    '(modals)/ai-food-detect': { mealId: string };
};

export type TabParamList = {
    index: undefined; // Home/Dashboard
    meals: undefined;
    plans: undefined;
    progress: undefined;
    profile: undefined;
};

export type AuthStackParamList = {
    login: undefined;
    register: undefined;
    onboarding: undefined;
};

export type ModalStackParamList = {
    'add-meal': { date?: number };
    'food-search': { mealId: string };
    'barcode-scanner': { onScan: (barcode: string) => void };
    'ai-food-detect': { mealId: string };
};

// Screen props
export interface DashboardScreenProps {
    route: { params: TabParamList['index'] };
}

export interface MealsScreenProps {
    route: { params: TabParamList['meals'] };
}

export interface PlansScreenProps {
    route: { params: TabParamList['plans'] };
}

export interface ProgressScreenProps {
    route: { params: TabParamList['progress'] };
}

export interface ProfileScreenProps {
    route: { params: TabParamList['profile'] };
}

export interface LoginScreenProps {
    route: { params: AuthStackParamList['login'] };
}

export interface RegisterScreenProps {
    route: { params: AuthStackParamList['register'] };
}

export interface OnboardingScreenProps {
    route: { params: AuthStackParamList['onboarding'] };
}

export interface AddMealModalProps {
    route: { params: ModalStackParamList['add-meal'] };
}

export interface FoodSearchModalProps {
    route: { params: ModalStackParamList['food-search'] };
}

export interface BarcodeScannerModalProps {
    route: { params: ModalStackParamList['barcode-scanner'] };
}

export interface AIFoodDetectModalProps {
    route: { params: ModalStackParamList['ai-food-detect'] };
}
