
# **OriGo** - Intelligent Trip Planner

## 1. Introduction

**OriGo** is an intelligent and collaborative travel planning application designed to help families and groups organize their adventures effortlessly. From planning destinations on a map to detailing daily activities and tracking budgets, this application leverages modern web technologies and generative AI to create a seamless, immersive, and engaging planning experience.

---

## 2. Table of Contents

- [Core Features](#3-core-features)
- [Tech Stack](#4-tech-stack)
- [Color Palette: "Sunrise Over the Path"](#5-color-palette-sunrise-over-the-path)
- [Project Structure](#6-project-structure)
- [Quick Start Guide (Local)](#7-quick-start-guide-local)
- [Firebase Setup](#8-firebase-setup)
- [Genkit (AI) Setup](#9-genkit-ai-setup)

---

## 3. Core Features

### Intelligent & Centralized Planning

-   🚀 **Guided Trip Creation**: Kickstart each new adventure with an intuitive, step-by-step wizard. Define your trip's name, dates, number of travelers, and context (type and style), setting the stage for personalized planning from the very first moment.
-   🗂️ **Unified Trip Dashboard**: Your personal command center. View all your trips—those you've created, been invited to, and those pending acceptance—in a single, elegant interface. Each trip is presented as an interactive card, showing its cover image, name, and dates, providing immediate access to your plans.
-   🔐 **Simple & Secure Authentication**: A robust and user-friendly access portal. We offer email/password registration and login, as well as seamless integration with **Google Sign-In** for quick and secure access, protecting your plans and personal data with Firebase Authentication standards.
-   👑 **Subscription System (Base)**: The application is built on an architecture that supports different user tiers. The initial free plan has a trip limit, laying the groundwork for future **Pro plans** with unlimited features and advanced functionalities, creating a scalable business model.

### Immersive Visualization & Organization

-   🌍 **Intelligent Interactive Map**: Transform your destination list into a visual and dynamic canvas. Powered by the **Google Maps Platform**, you can search and add cities with autocompletion, visualize your complete route with markers and connecting lines, and gain a geographical perspective of your adventure. Edit, delete, and manage your stops directly on the map for fluid and contextual planning.
-   📋 **Dynamic Drag-and-Drop Itinerary**: The heart of your trip. Organize each day's activities in a drag-and-drop interface that allows you to reorder plans on the fly. Each activity (meal, flight, tour, etc.) is managed with details like time, notes, cost, and attachments, making planning as flexible as your journey.
-   📊 **Visual Budget Tracking**: Keep your finances in check effortlessly. Record manual expenses or automatically import costs from itinerary activities. Visualize your spending with **interactive charts** that break down consumption by city and show the cumulative spending trend, allowing you to make informed decisions in real-time.
-   ✅ **Checklists & Additional Tools**: Make sure you don't forget anything. Use customizable checklists to organize your luggage and to-do items. The "More" section also houses collaborator management and is the space for future tools like document management and post-trip summaries.

### Generative AI Assistance

-   🎨 **AI-Powered Cover Image Generation**: Bring your trips to life before you even begin. Our generative AI, powered by **Google AI (Genkit)**, creates unique and inspiring cover images based on your trip details (destination, style, dates). Each plan will have an inspiring and photorealistic visual identity.
-   💡 **Intelligent Activity Recommendations**: Don't know what to do at your destination? Let our AI help. Based on the city, your interests, and the trip context, the system suggests relevant and exciting activities. With a single click, you can add these suggestions directly to your itinerary.

### Collaboration & Superior User Experience

-   🧑‍🤝‍🧑 **Real-Time & Collaborative Planning**: Group travel has never been easier. Invite friends and family to your trip via email. Collaborators can view and edit the itinerary, budget, and other details in real-time thanks to synchronization with **Firestore**, ensuring everyone is always on the same page.
-   📱 **Fully Responsive Design**: A flawless experience on any device. The interface has been carefully designed to be as functional and aesthetic on a desktop computer as it is on a tablet or smartphone, allowing you to plan from home or on the go.
-   🌗 **Light & Dark Themes**: Customize your planning environment. Switch between a clean, focused light theme and an elegant, eye-friendly dark theme that adapts to your preferences and lighting conditions.

---

## 4. Tech Stack

-   **Framework**: Next.js 15 (App Router, Server Components)
-   **Language**: TypeScript
-   **UI Library**: ShadCN UI
-   **Styling**: Tailwind CSS
-   **Icons**: Lucide React
-   **Charts**: Recharts
-   **State Management**: React Context API, React Hook Form
-   **Backend Services**: Firebase (Authentication, Firestore, Storage)
-   **Generative AI**: Google AI (via Genkit v1.x)
-   **Maps**: Google Maps Platform (`@vis.gl/react-google-maps`)

---

## 5. Color Palette: "Sunrise Over the Path"

The UI uses a light and dark theme system defined with HSL CSS variables in `src/app/globals.css`.

### Light Theme

| Element | Color Hex | HSL | Description |
| :--- | :--- | :--- | :--- |
| **Background** | `#F8F9FA` | `210 33.3% 97.3%` | Off-White |
| **Foreground** | `#212529` | `210 10.5% 14.5%` | Dark Gray (Text) |
| **Primary** | `#FF6B6B` | `0 100% 70.8%` | Coral Red |
| **Accent** | `#197D7A` | `178 65.5% 29.2%` | Teal Green |
| **Card** | `#FFFFFF` | `0 0% 100%` | White |
| **Secondary** | `#FFE5E5` | `0 100% 95.1%` | Light Coral |
| **Destructive** | `#E53E3E` | `0 72.2% 56.7%` | Red |
| **Border** | `#DEE2E6` | `210 14.3% 90.2%` | Light Gray |

### Dark Theme

| Element | Color Hex | HSL | Description |
| :--- | :--- | :--- | :--- |
| **Background** | `#121826` | `223 39.4% 11.4%`| Dark Blue-Gray |
| **Foreground** | `#E5E7EB` | `220 13.6% 91%`  | Light Gray (Text)|
| **Primary** | `#FFA0A0` | `0 100% 81.4%`    | Light Coral |
| **Accent** | `#20A39E` | `178 66.8% 38.2%`  | Bright Teal |
| **Card** | `#1F2937` | `215 27.9% 16.9%` | Off-Black |
| **Secondary** | `#374151` | `215 19.3% 26.7%` | Gray |
| **Destructive** | `#F87171` | `0 90.2% 70.8%`    | Light Red |
| **Border** | `#374151` | `215 19.3% 26.7%` | Gray |

---

## 6. Project Structure

The project follows the structure recommended by Next.js with the App Router.

```
/
├── src/
│   ├── app/                    # Application routes
│   │   ├── (auth)/             # Route group for authentication (login, signup)
│   │   ├── trips/[tripId]/     # Dynamic routes for each trip
│   │   │   ├── dashboard/
│   │   │   ├── map/
│   │   │   └── ...
│   │   ├── page.tsx            # Main "My Trips" dashboard
│   │   └── layout.tsx          # Main layout
│   │
│   ├── components/             # Reusable React components
│   │   ├── ai/                 # AI-related UI components
│   │   ├── auth/               # UI components for authentication
│   │   ├── budget/             # Components for the budget section
│   │   ├── dashboard/          # Components for the trip dashboard
│   │   ├── itinerary/          # Components for the itinerary section
│   │   ├── map/                # Components for the map section
│   │   ├── trips/              # Components for trip creation and management
│   │   ├── ui/                 # Base components from ShadCN (Button, Card, etc.)
│   │   └── layout/             # Layout components (Header, Footer, Sidebar)
│   │
│   ├── ai/                     # Server-side AI logic (Genkit)
│   │   ├── flows/              # Genkit flows for interacting with AI models
│   │   └── genkit.ts           # Genkit configuration and initialization
│   │
│   ├── context/                # React contexts for global state management
│   │   └── AuthContext.tsx     # Manages the user's authentication state
│   │
│   ├── firebase/               # Utility functions for interacting with Firebase
│   │   └── auth.ts             # Authentication functions (signup, signin, etc.)
│   │
│   └── lib/                    # Libraries, utilities, and types
│       ├── firebase.ts         # Firebase initialization
│       ├── types.ts            # TypeScript type definitions
│       └── utils.ts            # Utility functions (e.g., cn for classes)
│
├── public/                     # Static files
└── tailwind.config.ts          # Tailwind CSS configuration
```

---

## 7. Quick Start Guide (Local)

### Prerequisites

-   Node.js (v18 or higher)
-   `pnpm`, `npm`, or `yarn`
-   A Firebase account
-   A Google Cloud Platform project with Google Maps and Google AI APIs enabled

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <REPOSITORY_URL>
    cd <DIRECTORY_NAME>
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    # or npm install / yarn install
    ```

### Environment Variables

1.  Create a `.env.local` file in the root of the project.
2.  Copy the contents of the `.env.example` file into your new `.env.local` file.
3.  Fill in the variables with your own keys from Firebase and Google Cloud.

```ini
# .env.local

# Firebase Configuration
# Get these from your Firebase project -> Project Settings -> General
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

# Google Maps API Key
# Get this from your Google Cloud Platform project -> APIs & Services -> Credentials
# Ensure "Maps JavaScript API" and "Places API" are enabled.
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY

# Genkit API Key (Google AI)
# Get this from Google AI Studio -> Get API Key
# Used by Genkit flows on the server side.
GOOGLE_AI_API_KEY=YOUR_GOOGLE_AI_API_KEY
```

### Running the Application

1.  **Start the Next.js application**:
    ```bash
    pnpm dev
    ```
    The application will be available at `http://localhost:9002`.

2.  **Start the Genkit development server** (in a separate terminal):
    ```bash
    pnpm genkit:dev
    ```
    This starts the server that handles AI requests.

---

## 8. Firebase Setup

1.  **Create Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Create Web App**: Inside your project, add a new web application to get the configuration keys (`firebaseConfig`).
3.  **Authentication**:
    -   Go to the `Authentication` -> `Sign-in method` section.
    -   Enable the **Email/Password** and **Google** providers.
4.  **Firestore**:
    -   Go to the `Firestore Database` section and create a new database in production mode.
    -   **Data Model**:
        -   `users/{uid}`: Stores the user's profile and subscription information.
        -   `trips/{tripId}`: Main document for the trip. Contains subcollections for nested data.
            -   `trips/{tripId}/activities/{activityId}`
            -   `trips/{tripId}/cities/{cityId}`
            -   `trips/{tripId}/expenses/{expenseId}`
    -   **Security Rules**: Replace the default rules with more secure ones. A good starting point is:
        ```json
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{userId} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
            }
            match /trips/{tripId} {
              // The owner can do everything
              allow read, write: if request.auth != null && resource.data.ownerUid == request.auth.uid;
              // Editors can read and write (but not delete the trip)
              allow read, update: if request.auth != null && request.auth.uid in resource.data.editorUids;
            }
            match /trips/{tripId}/{subcollection}/{docId} {
                // Allows owners and editors to manage subcollections
                allow read, write: if request.auth != null && (get(/databases/$(database)/documents/trips/$(tripId)).data.ownerUid == request.auth.uid || request.auth.uid in get(/databases/$(database)/documents/trips/$(tripId)).data.editorUids);
            }
          }
        }
        ```
5.  **Storage**:
    -   Go to `Storage` and create a new bucket.
    -   **Security Rules**:
        ```
        rules_version = '2';
        service firebase.storage {
          match /b/{bucket}/o {
            // Only authenticated users can write to their own trip folders
            match /trip_covers/{tripId}/{allPaths=**} {
              allow write: if request.auth != null;
            }
            // Anyone can read images if they know the URL (default behavior)
            allow read;
          }
        }
        ```

---

## 9. Genkit (AI) Setup

-   The AI code is located in `src/ai/`.
-   The `GOOGLE_AI_API_KEY` variable in your `.env.local` is required for the flows to work.
-   To inspect the Genkit flows, with the development server (`genkit:dev`) running, go to `http://localhost:4000`.
