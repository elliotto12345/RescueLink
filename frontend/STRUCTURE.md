# RescueLink – Project Structure Guide

Your app is **Expo / React Native** (not React Vite web). This guide maps your spec to the actual codebase.

## Folder Structure

```
frontend/src/
├── components/          # Reusable UI — edit one file, updates everywhere
│   ├── auth/            # RoleSelector
│   ├── common/          # Button, Card, Input, StarRating, StatusBadge, LoadingSkeleton
│   └── layout/          # ScreenHeader, BottomNav, SectionTitle
├── constants/           # theme colors, roles, issue types, nav configs
├── contexts/            # AuthContext (global user session)
├── data/                # sampleData.js — mock data until API/Firestore is wired
├── firebase/            # Firebase config
├── navigation/          # AppNavigator, ProtectedScreen
├── pages/               # All screens (flat — same level as your original files)
├── services/            # authService, api, socket, storage (single source of truth)
```

## Design Tokens

Edit `constants/theme.js` to change colors app-wide:
- Primary Blue: `#2563EB`
- Emergency Red: `#DC2626`

## Adding a New Screen

1. Create file in `pages/`
2. Wrap with `ProtectedScreen` if login required
3. Register route in `navigation/AppNavigator.jsx`
4. Add to `constants/navigation.js` if it needs bottom nav

## Auth Flow

- Register → Firebase + Firestore `users/{uid}`
- Login → email verification required → `AuthContext.signIn()`
- Forgot password → `pages/ForgotPasswordScreen.jsx`

## What Still Uses Mock Data

- Recent requests, admin stats, payment history → `data/sampleData.js`
- Backend requests API uses in-memory storage — connect Prisma when ready
