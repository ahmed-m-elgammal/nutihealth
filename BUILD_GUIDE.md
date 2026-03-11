# Android Build Pipeline - NutriHealth

Last updated: 2026-03-09

## Project Snapshot

- Expo SDK: `54.0.x`
- React Native: `0.77.1`
- Workflow: Expo config + prebuilt `android/` (bare-style native project already present)
- Hermes: enabled
- New Architecture: currently `true` in `android/gradle.properties` (`newArchEnabled=true`)
- EAS project ID: `6928fe31-f31e-47d7-8f25-d7f15c433563`
- EAS CLI version floor in repo: `>= 18.0.0` (see `eas.json`)

Native modules that require Android native compilation:

- `@nozbe/watermelondb` + `@morrowdigital/watermelondb-expo-plugin`
- `react-native-mmkv`
- `expo-camera`, `expo-notifications`
- `react-native-reanimated`, `react-native-gesture-handler`
- `posthog-react-native`
- `react-native-worklets` is a local stub (`stubs/react-native-worklets`)

## Prerequisites

1. Node.js 22+ (`node -v`)
2. JDK 17 (`java -version`)
3. EAS CLI 18+ (`eas --version`)
4. Expo auth (`eas whoami`)
5. Android SDK installed (for local Gradle or local EAS)
6. Optional for local Android tasks:
   - `ANDROID_HOME`
   - `ANDROID_SDK_ROOT`

Recommended default SDK path on Windows:

```powershell
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
```

## Build Methods Comparison

| Method | Command | Output | Reliability | Notes |
|---|---|---|---|---|
| 1. EAS Cloud Build (recommended) | `eas build --platform android --profile preview --non-interactive` and `--profile production` | APK (preview) / AAB (production) via EAS download URL | Highest | Best for CI/prod; Expo-managed infra handles native toolchain/signing flow |
| 2. Local EAS Build | `eas build --platform android --local --profile preview` | Local APK | Low on Windows | In this repo logs, Windows run fails immediately: "Unsupported platform, macOS or Linux is required to build apps for Android" |
| 3. Prebuild + Gradle | `npx expo prebuild --clean --platform android` then `cd android && .\gradlew assembleDebug` | `android/app/build/outputs/apk/debug/app-debug.apk` | Medium | `--clean` is destructive for `android/`; only run after backup or VCS checkpoint |
| 4. `expo run:android` | `npx expo run:android` | Dev build installed on device/emulator | Medium | Good for device validation, not for Play Store release artifacts |

## Method 1 - EAS Cloud Build (Primary Path)

```powershell
eas whoami
eas build --platform android --profile preview --non-interactive
eas build --platform android --profile production --non-interactive
```

Success criteria:

- EAS prints build page/download URL for each job.
- Preview profile returns APK.
- Production profile returns AAB.

## Method 2 - Local EAS Build

```powershell
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
eas build --platform android --local --profile preview
```

Success criteria:

- Local `.apk` artifact produced.

Known limitation:

- On Windows, local EAS Android builds are not supported in current CLI behavior. Use Linux/macOS (or WSL/Linux CI runner) for local EAS.

## Method 3 - Prebuild + Gradle

Warning: `npx expo prebuild --clean` regenerates native directories and can overwrite manual Android changes.

```powershell
npx expo prebuild --clean --platform android
cd android
.\gradlew assembleDebug
```

Debug output:

- `android/app/build/outputs/apk/debug/app-debug.apk`

Release note:

- If your release policy requires env-based signing/versioning, set:
  - `NUTRIHEALTH_RELEASE_STORE_FILE`
  - `NUTRIHEALTH_RELEASE_STORE_PASSWORD`
  - `NUTRIHEALTH_RELEASE_KEY_ALIAS`
  - `NUTRIHEALTH_RELEASE_KEY_PASSWORD`
  - `NUTRIHEALTH_ANDROID_VERSION_CODE` (or use EAS auto-increment)

## Method 4 - Development Install (`expo run:android`)

```powershell
npx expo run:android
```

Success criteria:

- App installs and launches on connected device/emulator.

## Known Local Issues (Current Logs)

- `gradle_debug_log.txt` fails at `:watermelondb-jsi:compileDebugJavaWithJavac` with missing `JSIModulePackage` / `JSIModuleSpec` symbols. This is consistent with React Native API changes and should be resolved before relying on local Gradle debug/release.
- `local_build_log.txt` shows local EAS Android build unsupported on Windows host.

## Scripted Pipeline

Use the included script to run methods with logging:

```powershell
.\build-android.ps1 -Method cloud-all
```

Useful variants:

```powershell
.\build-android.ps1 -Method all
.\build-android.ps1 -Method prebuild-clean-gradle-debug -AllowPrebuildClean
.\build-android.ps1 -Method list
```

Each run writes timestamped logs under `build-logs/`.
