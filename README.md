# Aaj Kya Banau? — Android Pilot

An **Expo / React Native / TypeScript** mobile prototype you can run on Android and edit using OpenAI Codex, VS Code, or any code editor.

## Features
- Discover and search regional breakfast, lunch, dinner and snack recipes
- Chef directory and chef profiles
- Chef Studio: create/edit your chef profile and publish recipes
- Enter a structured ingredient list and step-by-step instructions
- Rate recipes and separately rate chefs' recipe content (1–5 stars)
- Follow chefs, save recipes, browse ratings
- Persist pilot data on the device using AsyncStorage
- Five demo recipes to explore immediately

## Run on Android (Windows/macOS/Linux)

Install Node.js 22.13+ and the **Expo Go** app on your Android phone. In this folder:

```bash
npm install
npx expo install --fix
npm run start
```

Scan the terminal QR code using Expo Go. The laptop and phone generally need the same Wi-Fi network. If local networking fails, run `npx expo start --tunnel`.

Android Emulator: install Android Studio, create a virtual device, start it, then run `npm run android`.

## Android APK / AAB

After verifying the app, configure an Expo Application Services (EAS) project. For a testing APK, add an EAS build profile with `android.buildType` set to `apk`, then run `eas build -p android --profile preview`. Google Play normally expects an AAB build. Signing, privacy disclosure and production services must be added before store submission.

## Project design
- `App.tsx` — pilot screens and state management
- `src/data.ts` — typed entities and starter demo content
- `app.json` — Android app metadata

## Important limitations

This is a **local-data pilot**, not yet a multi-user cloud app. It has no server, real authentication, shared public publishing, media upload, backend moderation, or verified users. Ratings are limited to one local demo identity and are **not public across phones**. The chef profiles and example recipes are demo data. Do **not** represent this as a production/public marketplace. Recipe values should be checked before preparing food, especially for allergies.

## Next production milestones
1. Add Firebase Auth or another secure identity service.
2. Design PostgreSQL backend and APIs with per-user ownership and authorization.
3. Add photo/video upload with rights disclosures, moderation and reporting.
4. Implement server-enforced unique ratings and antifraud restrictions.
5. Add public chef profiles, follows, analytics and administration.
6. Legal/privacy review and end-to-end tests before launch.

## Suggested Codex prompt

> Open this Expo React Native project. Keep current recipe discovery, chef studio, ingredient lists, follows, saves, and separate chef/recipe ratings intact. Add Firebase Authentication and a NestJS/PostgreSQL backend with secured REST endpoints, server-validated recipe publishing, one rating per user/target, content reporting/moderation, and tests. Do not add food ordering, grocery purchases, chef bookings or paid services. Start by presenting a file-by-file migration plan and tests.
