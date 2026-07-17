# RescueLink 2.0 — Complete Beginner's Guide

This document explains **everything** about the RescueLink project in plain language. By the end, you should understand what each part does, how the frontend and backend work together, and how to keep building on your own.

---

## Table of Contents

1. [What Is RescueLink?](#1-what-is-rescuelink)
2. [The Big Picture (How It All Connects)](#2-the-big-picture-how-it-all-connects)
3. [Tools & Technologies Used](#3-tools--technologies-used)
4. [Project Folder Structure](#4-project-folder-structure)
5. [Frontend Explained (The Mobile App)](#5-frontend-explained-the-mobile-app)
6. [Backend Explained (The Server)](#6-backend-explained-the-server)
7. [User Roles in the App](#7-user-roles-in-the-app)
8. [How Key Features Work (Step by Step)](#8-how-key-features-work-step-by-step)
9. [Where Data Is Stored](#9-where-data-is-stored)
10. [How to Run the Project on Your Computer](#10-how-to-run-the-project-on-your-computer)
11. [How to Make Common Updates](#11-how-to-make-common-updates)
12. [Environment Variables (Secret Settings)](#12-environment-variables-secret-settings)
13. [Deployment (Where the App Lives Online)](#13-deployment-where-the-app-lives-online)
14. [Glossary (Terms You Will See Often)](#14-glossary-terms-you-will-see-often)

---

## 1. What Is RescueLink?

**RescueLink** is a roadside assistance mobile app built with **React Native** and **Expo**. Think of it like Uber, but for car breakdowns instead of rides.

- A **driver** (car owner) can request help when their car has a problem (flat tyre, dead battery, etc.).
- A **mechanic** (service provider) receives the request, drives to the driver, fixes the problem, and gets paid.
- An **admin** can oversee the platform.

The app runs on **Android** and **iOS** phones. There is also a **backend server** that handles real-time updates, email codes, and some API requests.

---

## 2. The Big Picture (How It All Connects)

Imagine the app as two main parts talking to each other:

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR PHONE (Frontend)                       │
│  React Native + Expo — screens, buttons, maps, chat UI           │
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
                ▼                             ▼
     ┌──────────────────┐         ┌──────────────────────┐
     │     Firebase      │         │   Backend Server      │
     │  (Google Cloud)   │         │  (Node.js + Express)  │
     │                   │         │                       │
     │ • User accounts   │         │ • Real-time sockets   │
     │ • User profiles   │         │ • OTP email codes     │
     │ • Service requests│         │ • Mechanic online     │
     │ • Chat messages   │         │   status tracking     │
     │ • Ratings         │         │ • Some REST APIs      │
     └──────────────────┘         └──────────────────────┘
                │                             │
                └────────── PostgreSQL ───────┘
                     (Database — partially used)
```

**In simple terms:**

| Part | What it does | Analogy |
|------|--------------|---------|
| **Frontend** | Everything you see and tap on your phone | The storefront |
| **Firebase** | Stores users, requests, chat, ratings | The filing cabinet in the cloud |
| **Backend** | Sends live updates, emails, and API responses | The phone operator connecting people |
| **PostgreSQL** | Structured database (used for auth API) | A formal record book |

---

## 3. Tools & Technologies Used

### Frontend (Mobile App)

| Tool | What It Is | Role in RescueLink |
|------|------------|-------------------|
| **React Native** | Framework to build mobile apps using JavaScript | Builds all screens and UI for Android/iOS |
| **Expo** | Toolkit that makes React Native easier to run and test | Lets you start the app with `npm start` without complex setup |
| **React Navigation** | Library for moving between screens | Handles Login → Dashboard → Request Help, etc. |
| **Firebase Auth** | Google's login system | Register, login, password reset |
| **Firebase Firestore** | Google's cloud database | Stores users, service requests, chat |
| **Axios** | HTTP client | Sends requests to the backend API |
| **Socket.IO Client** | Real-time communication library | Live location, chat, request status updates |
| **Expo Location** | GPS access | Gets the driver's location for help requests |
| **React Native Maps** | Map component | Shows mechanic location on a map |
| **AsyncStorage** | Local phone storage | Saves login session and cached data offline |

### Backend (Server)

| Tool | What It Is | Role in RescueLink |
|------|------------|-------------------|
| **Node.js** | JavaScript runtime on a server | Runs the backend code |
| **Express** | Web framework for Node.js | Defines API routes like `/api/auth/login` |
| **Socket.IO** | Real-time server | Pushes live events to connected phones |
| **Prisma** | Database toolkit (ORM) | Talks to PostgreSQL for user registration/login API |
| **PostgreSQL** | Relational database | Stores User, Mechanic, Request tables |
| **bcrypt** | Password hashing | Keeps passwords secure (never stored as plain text) |
| **jsonwebtoken (JWT)** | Token system | Creates login tokens for API auth |
| **Nodemailer** | Email sender | Sends OTP verification codes via Gmail |
| **Firebase Admin** | Server-side Firebase SDK | Resets passwords after OTP verification |
| **Twilio** | SMS service (installed) | Available for future SMS features |
| **CORS** | Security middleware | Allows the mobile app to talk to the server |
| **dotenv** | Environment loader | Loads secret settings from `.env` file |

### Deployment & Hosting

| Service | Purpose |
|---------|---------|
| **Railway** | Hosts the backend server in production |
| **Firebase Console** | Manages authentication and Firestore database |
| **Expo Go / EAS Build** | Test and build the mobile app |

---

## 4. Project Folder Structure

```
RescueLink 2.0/
│
├── frontend/                    ← THE MOBILE APP (what users see)
│   ├── App.js                   ← App entry point (loads navigation)
│   ├── index.js                 ← Registers the app with Expo
│   ├── app.json                 ← App name, icon, splash screen settings
│   ├── package.json             ← Frontend dependencies and scripts
│   ├── assets/                  ← App icon, splash images
│   └── src/                     ← All source code lives here
│       ├── components/          ← Reusable UI pieces
│       ├── constants/           ← Fixed values (colors, roles, statuses)
│       ├── contexts/            ← Global app state (logged-in user)
│       ├── firebase/            ← Firebase connection settings
│       ├── navigation/          ← Screen routing and login protection
│       ├── pages/               ← Full screens (Login, Dashboard, etc.)
│       ├── services/            ← Business logic and API calls
│       └── utils/               ← Helper functions
│
├── backend/                     ← THE SERVER (runs in the cloud)
│   ├── server.js                ← Main server file (starts everything)
│   ├── package.json             ← Backend dependencies
│   ├── .env.example             ← Template for secret settings
│   ├── routes/                  ← API endpoints grouped by feature
│   │   ├── auth.js              ← Register / login
│   │   ├── requests.js          ← Help requests API
│   │   ├── mechanics.js         ← Mechanic listing and availability
│   │   └── otp.js               ← Email verification codes
│   ├── prisma/                  ← Database schema and migrations
│   │   └── schema.prisma        ← Defines User, Mechanic, Request tables
│   ├── state/                   ← In-memory server state
│   │   └── onlineUsers.js       ← Tracks which mechanics are online
│   └── utils/
│       └── firebaseAdmin.js     ← Server-side Firebase setup
│
├── package.json                 ← Root scripts (runs Expo from project root)
└── .gitignore                   ← Files Git should not track
```

---

## 5. Frontend Explained (The Mobile App)

### 5.1 Entry Points

| File | Purpose |
|------|---------|
| `frontend/index.js` | Tells Expo to launch the app |
| `frontend/App.js` | Loads `AppNavigator` — the screen router |
| `frontend/app.json` | App display name, icons, orientation, splash screen |

### 5.2 Navigation (`src/navigation/`)

| File | Purpose |
|------|---------|
| `AppNavigator.jsx` | **The map of the entire app.** Lists every screen and connects them. Wraps everything in `AuthProvider` so login state is available everywhere. |
| `ProtectedScreen.jsx` | **Security guard.** If you are not logged in, it sends you to Login. If your role is wrong (e.g. driver trying to open mechanic screen), it redirects you to the correct dashboard. |

**All registered screens:**

| Screen Name | File | Who Uses It |
|-------------|------|-------------|
| Home | `pages/HomeScreen.jsx` | Everyone (landing page) |
| Login | `pages/LoginScreen.jsx` | Everyone |
| Register | `pages/RegisterScreen.jsx` | Everyone |
| ForgotPassword | `pages/ForgotPasswordScreen.jsx` | Everyone |
| VerifyOTP | `pages/VerifyOTPScreen.jsx` | Everyone (email verification) |
| NewPassword | `pages/NewPasswordScreen.jsx` | Everyone (after OTP reset) |
| UserDashboard | `pages/driver/UserDashboard.jsx` | Drivers |
| RequestHelp | `pages/driver/RequestHelpScreen.jsx` | Drivers |
| TrackMechanic | `pages/driver/TrackMechanicScreen.jsx` | Drivers |
| EmergencyCenter | `pages/driver/EmergencyCenterScreen.jsx` | Drivers |
| Payments | `pages/driver/PaymentsScreen.jsx` | Drivers |
| Ratings | `pages/driver/RatingsScreen.jsx` | Drivers |
| Chat | `pages/driver/ChatScreen.jsx` | Drivers & Mechanics |
| AIAssistant | `pages/driver/AIAssistantScreen.jsx` | Drivers |
| MechanicDashboard | `pages/mechanic/MechanicDashboard.jsx` | Mechanics |
| JobScreen | `pages/mechanic/JobScreen.jsx` | Mechanics |
| PerformanceInsights | `pages/mechanic/PerformanceInsightsScreen.jsx` | Mechanics |
| AdminDashboard | `pages/admin/AdminDashboard.jsx` | Admins |
| Profile | `pages/ProfileScreen.jsx` | Everyone (logged in) |

### 5.3 Pages / Screens (`src/pages/`)

Pages are **full screens** — one file = one screen the user sees.

**Public screens** (no login required):
- **HomeScreen** — Landing page with app features, "Get Started" and "Login" buttons.
- **LoginScreen** — Email and password login.
- **RegisterScreen** — Create account; choose role (Driver or Mechanic).
- **ForgotPasswordScreen** — Request a reset code by email.
- **VerifyOTPScreen** — Enter the 6-digit code sent to email.
- **NewPasswordScreen** — Set a new password after OTP verification.

**Driver screens** (`pages/driver/`):
- **UserDashboard** — Driver home: quick actions, active request status, service history.
- **RequestHelpScreen** — Pick issue type, share location, find nearby mechanics.
- **TrackMechanicScreen** — Live map tracking of the assigned mechanic.
- **EmergencyCenterScreen** — SOS contacts and emergency actions.
- **PaymentsScreen** — View and complete payment after service.
- **RatingsScreen** — Rate the mechanic after job completion.
- **ChatScreen** — Real-time messaging with the mechanic.
- **AIAssistantScreen** — AI help for diagnosing car problems.

**Mechanic screens** (`pages/mechanic/`):
- **MechanicDashboard** — Mechanic home: incoming jobs, availability toggle.
- **JobScreen** — Manage an active job (accept, on the way, arrived, complete).
- **PerformanceInsightsScreen** — Stats, ratings, job history.

**Admin screens** (`pages/admin/`):
- **AdminDashboard** — Platform overview and management.

**Shared:**
- **ProfileScreen** — Edit profile, logout.

### 5.4 Components (`src/components/`)

Components are **reusable building blocks**. Edit one component and every screen that uses it updates automatically.

**`components/common/` — Basic UI elements**

| Component | Purpose |
|-----------|---------|
| `Button.jsx` | Styled button (primary, outline, emergency styles) |
| `Input.jsx` | Text input field with label and validation styling |
| `Card.jsx` | White rounded container for grouping content |
| `StarRating.jsx` | Interactive star rating display/input |
| `StatusBadge.jsx` | Colored label showing request status (Pending, Accepted, etc.) |
| `LoadingSkeleton.jsx` | Placeholder animation while data loads |

**`components/layout/` — Page structure**

| Component | Purpose |
|-----------|---------|
| `ScreenHeader.jsx` | Top bar with title and back button |
| `BottomNav.jsx` | Bottom tab bar (Home, Request, SOS, Chat, Profile) |
| `SectionTitle.jsx` | Section heading with optional subtitle |

**`components/auth/`**

| Component | Purpose |
|-----------|---------|
| `RoleSelector.jsx` | Lets user pick Driver or Mechanic during registration |

### 5.5 Contexts (`src/contexts/`)

| File | Purpose |
|------|---------|
| `AuthContext.jsx` | **Global login state.** Stores the current user, handles sign-in/sign-out, keeps mechanics marked as online/offline, and restores session from phone storage. Any screen can call `useAuth()` to get `{ user, loading, signIn, signOut }`. |

### 5.6 Services (`src/services/`)

Services contain **logic that is not UI** — API calls, database reads, socket events. Screens call services instead of writing the same code repeatedly.

| File | Purpose |
|------|---------|
| `api.js` | Base URL and HTTP functions for backend REST API (requests, mechanics, OTP) |
| `authService.js` | Register, login, logout, password reset using Firebase |
| `requestService.js` | Create/update service requests in Firestore, track active request |
| `mechanicService.js` | Fetch registered mechanics, check online status |
| `mechanicPresence.js` | Mark mechanic online/offline in Firestore |
| `chatService.js` | Send/receive chat messages, typing indicators, read receipts |
| `chatCacheService.js` | Cache chat messages locally for faster loading |
| `ratingService.js` | Submit and fetch mechanic ratings |
| `serviceHistory.js` | Store completed service history on the phone |
| `socket.js` | Connect to Socket.IO server, emit/receive real-time events |
| `storage.js` | Save/load user session in AsyncStorage |

### 5.7 Constants (`src/constants/`)

Constants are **fixed values used across the app**. Change them once, update everywhere.

| File | Purpose |
|------|---------|
| `theme.js` | Colors, spacing, border radius, shadows — the app's visual design system |
| `roles.js` | User roles (`user`, `mechanic`, `admin`) and dashboard routing |
| `navigation.js` | Bottom nav tab configs for drivers and mechanics |
| `requestStatus.js` | Request lifecycle statuses (pending → accepted → completed) |
| `issueTypes.js` | List of car problems (Flat Tyre, Dead Battery, etc.) |
| `emergencyContacts.js` | Emergency phone numbers and contacts |

### 5.8 Firebase (`src/firebase/`)

| File | Purpose |
|------|---------|
| `config.js` | Firebase project credentials, initializes Auth and Firestore |

### 5.9 Utils (`src/utils/`)

| File | Purpose |
|------|---------|
| `location.js` | Helper functions for GPS/location formatting |

---

## 6. Backend Explained (The Server)

### 6.1 Main Server (`server.js`)

This is the **heart of the backend**. It:

1. Creates an Express web server and HTTP server.
2. Attaches Socket.IO for real-time communication.
3. Registers middleware (CORS, JSON parsing).
4. Defines Socket.IO event handlers for live features.
5. Mounts API routes under `/api/...`.
6. Listens on port 5000 (or `PORT` from environment).

**Socket.IO events handled:**

| Event (client sends) | What happens |
|---------------------|--------------|
| `sendLocation` | Broadcasts mechanic/driver location to all connected clients |
| `acceptRequest` | Notifies the driver that a mechanic accepted |
| `mechanicOnTheWay` | Notifies the driver the mechanic is coming |
| `mechanicArrived` | Notifies the driver the mechanic has arrived |
| `driverArrived` | Notifies the mechanic the driver confirmed arrival |
| `serviceComplete` | Notifies the driver to pay |
| `declineRequest` | Notifies the driver the request was declined |
| `cancelRequest` | Notifies the mechanic the driver cancelled |
| `sendMessage` | Delivers chat message to the recipient |
| `typingStart` / `typingStop` | Shows typing indicator in chat |
| `messagesRead` | Updates read receipts |
| `newRequest` | Notifies assigned mechanic of a new job |
| `updateStatus` | Broadcasts status changes |

When a user connects, they pass `userId` and `role` in the socket query string so the server knows who they are.

### 6.2 API Routes (`backend/routes/`)

**`auth.js` — `/api/auth`**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/register` | POST | Create user in PostgreSQL, return JWT token |
| `/login` | POST | Verify credentials, return JWT token |

> **Note:** The mobile app primarily uses **Firebase Auth** for login. This backend auth route exists as an alternative/API layer using PostgreSQL + Prisma.

**`requests.js` — `/api/requests`**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | POST | Create a new help request |
| `/` | GET | Get all requests |
| `/:id` | GET | Get one request by ID |
| `/:id/status` | PUT | Update request status |

> **Note:** Currently uses **in-memory storage** (data resets when server restarts). The main app uses **Firestore** for requests via `requestService.js`.

**`mechanics.js` — `/api/mechanics`**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | List all mechanics |
| `/online` | GET | List IDs of online mechanics |
| `/nearby` | GET | Find mechanics near a latitude/longitude |
| `/:id/availability` | PUT | Toggle mechanic available/unavailable |

**`otp.js` — `/api/otp`**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/send` | POST | Generate and email a 6-digit OTP code |
| `/verify` | POST | Verify the OTP code |
| `/reset-password` | POST | Reset Firebase password after OTP verified |

### 6.3 Database (`backend/prisma/`)

**`schema.prisma`** defines three database tables:

| Model | Fields | Purpose |
|-------|--------|---------|
| **User** | id, name, email, phone, password, role | Driver accounts (PostgreSQL) |
| **Mechanic** | id, name, email, phone, password, latitude, longitude, available, verified, rating, totalJobs | Mechanic accounts |
| **Request** | id, userId, mechanicId, issue, description, latitude, longitude, status | Help requests linked to users and mechanics |

Run migrations with Prisma when you change the schema.

### 6.4 Supporting Files

| File | Purpose |
|------|---------|
| `state/onlineUsers.js` | Tracks which user IDs are currently connected via Socket.IO |
| `utils/firebaseAdmin.js` | Initializes Firebase Admin SDK for server-side password reset |
| `.env.example` | Template showing required environment variables |
| `railway.json` / `Procfile` / `nixpacks.toml` | Deployment configuration for Railway hosting |

---

## 7. User Roles in the App

Defined in `frontend/src/constants/roles.js`:

| Role Code | Label | Dashboard Screen |
|-----------|-------|------------------|
| `user` | Driver | UserDashboard |
| `mechanic` | Service Provider | MechanicDashboard |
| `admin` | Admin | AdminDashboard |

After login, the app reads the user's role from Firebase and navigates to the correct dashboard using `getDashboardForRole()`.

---

## 8. How Key Features Work (Step by Step)

### Registration & Login

```
1. User fills Register form → picks Driver or Mechanic role
2. authService.registerUser() creates Firebase Auth account
3. User profile saved to Firestore: users/{uid}
4. Backend sends OTP email via /api/otp/send
5. User enters OTP on VerifyOTPScreen
6. markEmailVerified() updates Firestore
7. User can now log in
8. Login checks email is verified → AuthContext.signIn() saves session
9. App navigates to role-specific dashboard
```

### Requesting Help (Driver)

```
1. Driver opens RequestHelpScreen
2. App gets GPS location (expo-location)
3. mechanicService.fetchNearbyMechanicsWithStatus() loads mechanics from Firestore
4. Driver picks issue type and submits
5. requestService.createServiceRequest() saves to Firestore collection "serviceRequests"
6. socket.emitNewRequest() notifies the mechanic in real time
7. Driver sees status updates on UserDashboard and TrackMechanicScreen
```

### Accepting a Job (Mechanic)

```
1. Mechanic receives "incomingRequest" via Socket.IO
2. Mechanic accepts on JobScreen
3. socket.emitAcceptRequest() notifies the driver
4. Mechanic updates status: On The Way → Arrived → Service Complete
5. Each step sends a socket event to the driver
6. Driver confirms arrival and pays on PaymentsScreen
7. Driver rates mechanic on RatingsScreen
```

### Real-Time Chat

```
1. chatService creates/gets a chat thread in Firestore
2. Messages saved to Firestore AND sent via socket for instant delivery
3. chatCacheService stores messages locally for offline/fast reload
4. Typing indicators and read receipts use socket events
```

### Mechanic Online Status

```
1. When a mechanic logs in, AuthContext calls markMechanicOnline()
2. Firestore user document updated: isOnline = true, lastSeen = now
3. Backend Socket.IO also tracks connection in onlineUsers.js
4. When app goes to background or user logs out → markMechanicOffline()
```

---

## 9. Where Data Is Stored

| Data | Storage Location | Notes |
|------|------------------|-------|
| User accounts (login) | Firebase Auth | Email + password |
| User profiles | Firestore `users/` | Name, phone, role, online status |
| Service requests | Firestore `serviceRequests/` | Main request flow |
| Chat messages | Firestore `chats/`, `chatThreads/` | With local cache |
| Active request (temp) | AsyncStorage on phone | Quick access while app is open |
| Service history | AsyncStorage on phone | Completed jobs list |
| Login session | AsyncStorage on phone | Keeps user logged in |
| Backend auth users | PostgreSQL via Prisma | Alternative auth layer |
| Backend requests API | In-memory array | Resets on server restart |
| OTP codes | In-memory on server | Expires after 5 minutes |

---

## 10. How to Run the Project on Your Computer

### Prerequisites

Install these first:

1. **Node.js** (v18 or newer) — [https://nodejs.org](https://nodejs.org)
2. **Expo Go** app on your phone (Android/iOS) — for testing
3. **Git** — for version control

### Run the Frontend (Mobile App)

```bash
# From the project root folder
cd "c:\MR. DAVID ANAKPOR\DA CODES\PROJECT\Main Project\RescueLink 2.0"

# Install dependencies (first time only)
npm install

# Start Expo development server
npm start
```

Scan the QR code with Expo Go on your phone, or press `a` for Android emulator / `i` for iOS simulator.

### Run the Backend (Server)

```bash
# Navigate to backend folder
cd backend

# Install dependencies (first time only)
npm install

# Copy environment template and fill in your values
copy .env.example .env

# Start the server
npm run dev
```

The server runs at `http://localhost:5000`. Visit that URL in a browser — you should see: `{ "message": "RescueLink Backend is Alive 🚀" }`.

### Point Frontend to Local Backend (Optional)

For local testing, change the URLs in:

- `frontend/src/services/api.js` → `BASE_URL`
- `frontend/src/services/socket.js` → `SOCKET_URL`

Replace the Railway URL with `http://YOUR_COMPUTER_IP:5000` (use your LAN IP, not `localhost`, when testing on a physical phone).

---

## 11. How to Make Common Updates

### Change App Colors

Edit `frontend/src/constants/theme.js`:

```javascript
export const colors = {
  primary: "#2563EB",    // Main blue — change this for brand color
  emergency: "#DC2626",  // SOS / urgent red
  // ... other colors
};
```

### Add a New Issue Type

Edit `frontend/src/constants/issueTypes.js` — add an object to the array:

```javascript
{ id: 9, label: "Locked Out", emoji: "🔑", category: "Locksmith" },
```

### Add a New Screen

1. Create a new file in `frontend/src/pages/` (or a subfolder like `driver/`).
2. Import it in `frontend/src/navigation/AppNavigator.jsx`.
3. Add a `<Stack.Screen name="YourScreen" component={YourScreen} />` line.
4. Navigate to it from any screen: `navigation.navigate("YourScreen")`.
5. If login is required, wrap your screen content with `<ProtectedScreen>`.

Example skeleton for a protected screen:

```javascript
import ProtectedScreen from "../navigation/ProtectedScreen";

export default function MyNewScreen({ navigation }) {
  return (
    <ProtectedScreen navigation={navigation}>
      {/* Your screen content here */}
    </ProtectedScreen>
  );
}
```

### Add a Bottom Nav Tab

Edit `frontend/src/constants/navigation.js` — add an entry to `DRIVER_NAV` or `PROVIDER_NAV` with a `route` matching your screen name in AppNavigator.

### Change Emergency Contacts

Edit `frontend/src/constants/emergencyContacts.js`.

### Add a New API Endpoint (Backend)

1. Create or edit a file in `backend/routes/`.
2. Register it in `server.js`: `app.use("/api/yourroute", require("./routes/yourroute"));`
3. Add a matching function in `frontend/src/services/api.js`.

### Add a New Socket Event

1. Add a handler in `backend/server.js` inside the `io.on("connection", ...)` block.
2. Add an emit function in `frontend/src/services/socket.js`.
3. Listen for the event in the relevant screen using `getSocket().on("eventName", callback)`.

---

## 12. Environment Variables (Secret Settings)

Backend secrets go in `backend/.env` (never commit this file to Git):

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default 5000) |
| `JWT_SECRET` | Secret key for login tokens |
| `DATABASE_URL` | PostgreSQL connection string for Prisma |
| `GMAIL_USER` | Gmail address for sending OTP emails |
| `GMAIL_PASSWORD` | Gmail App Password (not your regular password) |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin JSON (single line) for password reset |

Copy from `backend/.env.example` and replace placeholder values with your real credentials.

---

## 13. Deployment (Where the App Lives Online)

| Component | Where It Runs |
|-----------|---------------|
| Backend server | **Railway** — `https://rescuelink-production-cb78.up.railway.app` |
| Firebase (Auth + Firestore) | **Google Firebase Console** — project `rescuelink-7559e` |
| PostgreSQL database | Connected via Railway or external provider |
| Mobile app | Built with **Expo EAS Build** and published to App Store / Play Store |

The frontend is currently configured to talk to the **production Railway URL** in `api.js` and `socket.js`.

---

## 14. Glossary (Terms You Will See Often)

| Term | Simple Meaning |
|------|----------------|
| **Component** | A reusable piece of UI (button, card, header) |
| **Screen / Page** | A full view the user sees (Login, Dashboard) |
| **Navigation** | Moving between screens |
| **Context** | Shared data available to the whole app (like logged-in user) |
| **Service** | File that handles API calls and business logic |
| **Firestore** | Google's cloud database — stores JSON-like documents |
| **Socket.IO** | Technology for instant two-way communication |
| **API** | A URL the app calls to get or send data |
| **REST API** | Standard HTTP endpoints (GET, POST, PUT, DELETE) |
| **OTP** | One-Time Password — the 6-digit email code |
| **JWT** | JSON Web Token — proves you are logged in to the API |
| **AsyncStorage** | Small database on the phone for saving settings |
| **Prisma** | Tool that lets the backend talk to PostgreSQL easily |
| **Middleware** | Code that runs before every request (like CORS) |
| **Expo** | Development platform that simplifies React Native |
| **State** | Data that can change (loading, user info, request status) |
| **Hook** | React function like `useState`, `useEffect`, `useAuth` |

---

## Quick Reference: "I Want To Change..."

| I want to change... | Edit this file |
|---------------------|----------------|
| App name or icon | `frontend/app.json` |
| Colors and spacing | `frontend/src/constants/theme.js` |
| Login / register logic | `frontend/src/services/authService.js` |
| Which screens exist | `frontend/src/navigation/AppNavigator.jsx` |
| Bottom navigation tabs | `frontend/src/constants/navigation.js` |
| Car problem types | `frontend/src/constants/issueTypes.js` |
| Request status labels | `frontend/src/constants/requestStatus.js` |
| Backend API URL | `frontend/src/services/api.js` |
| Real-time server URL | `frontend/src/services/socket.js` |
| Firebase settings | `frontend/src/firebase/config.js` |
| Server startup and sockets | `backend/server.js` |
| Database tables | `backend/prisma/schema.prisma` |
| Email OTP logic | `backend/routes/otp.js` |

---

## Learning Path for Beginners

If you are new to React Native, study in this order:

1. **React basics** — components, props, state, useEffect
2. **React Native basics** — View, Text, TouchableOpacity, StyleSheet
3. **Expo** — run the app, understand `app.json`
4. **React Navigation** — how screens connect
5. **Firebase** — Auth and Firestore documentation
6. **This project's `HomeScreen.jsx` and `LoginScreen.jsx`** — simplest screens to read first
7. **Then `AuthContext.jsx` and `authService.js`** — understand login flow
8. **Then `UserDashboard.jsx` and `requestService.js`** — understand main feature
9. **Backend `server.js`** — understand real-time events last

---

*This guide was written for RescueLink 2.0. Update it whenever you add major features so future you (or teammates) always have an accurate map of the project.*
