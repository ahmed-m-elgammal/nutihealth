# NutriHealth

NutriHealth is a comprehensive React Native application designed for personalized nutrition tracking and meal management. It helps users log their meals, import recipes from the web, and monitor their progress towards healthy living goals.

## ✨ Key Features

- **Personalized Goal Planning**: Weekly goal plans tailored to your health objectives.
- **Smart Recipe Import**: Import recipes directly from any URL with intelligent parsing (supporting `schema.org` and HTML fallback).
- **Multilingual Support**: Full support for English and Arabic, including RTL (Right-to-Left) layout handling.
- **Offline First**: Robust local storage and caching with WatermelonDB and MMKV.
- **Advanced Analytics**: Track your progress with detailed nutrition insights and activity history.
- **Premium UI/UX**: Modern, fluid interface built with NativeWind (Tailwind CSS) and Reanimated.

## 🏗️ Project Structure

The project is divided into a frontend (React Native/Expo) and a backend (Node.js/Express).

### Frontend

- `src/app/`: Expo Router based navigation and screens.
- `src/components/`: Reusable UI components.
- `src/database/`: Local database models and schemas (WatermelonDB).
- `src/services/`: API integration and business logic.
- `src/utils/`: Helper functions and utilities.
- `src/i18n/`: Localization files for internationalization.

### Backend

- `backend/server.js`: Express server setup.
- `backend/routes/`: API endpoint definitions.
- `backend/services/`: Server-side business logic and external integrations.
- `backend/utils/`: Server utilities.

## 🚀 Getting Started

### Prerequisites

- Node.js (Lateest LTS recommended)
- Expo Go app on your mobile device or an emulator.

### 1. Frontend Setup

Install dependencies from the root directory:

```bash
npm install
```

Start the Expo development server:

```bash
npm run start
```

### 2. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Populate your secrets (API keys for external services) in the `.env` file.
The backend is used for AI/recipe/weather proxy routes only.

Start the backend server:

```bash
npm run dev
```

The server will be available at `http://localhost:3000`.

### 3. Environment Configuration

Set your frontend API URL in the root `.env` file:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_or_publishable_key
```

Before enabling sync in production, run the SQL policies in `docs/supabase/rls-policies.sql` in your Supabase project.

## 🧪 Testing

Run the test suite:

```bash
npm test
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
