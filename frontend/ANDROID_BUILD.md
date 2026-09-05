# Novarix Android APK

## Prerequisites

- Node.js 18+
- Java JDK 17+
- Android Studio with Android SDK and platform tools
- `ANDROID_HOME` or `ANDROID_SDK_ROOT` configured

## First-time setup

```powershell
cd frontend
npm install
npm run android:add
```

Run `android:add` only once. It creates the native Android project in `frontend/android`.

## Build an installable debug APK

```powershell
cd frontend
npm run apk:debug
```

The APK is generated at:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Install it on a connected device with:

```powershell
cd frontend
npx cap run android
```

## Release APK

```powershell
cd frontend
npm run apk:release
```

The release build must be signed before distributing it. Configure a keystore in
the generated Android project or use Android Studio's signed bundle/APK wizard.

The mobile build points to the live Railway backend:

```text
https://novarixapp-production.up.railway.app
```

The backend allows Capacitor's `capacitor://localhost` and `http://localhost`
origins for native API requests.