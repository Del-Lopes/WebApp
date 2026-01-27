# PLAN-members-area.md

## Overview
Implementation of a Members Area for the Tradexperience web application. The goal is to transition from a static prototype to a dynamic, database-driven application using Supabase. The system will handle User Authentication (Admin, Client, Partner), license requests for Expert Advisors (EAs), and serve educational content.

## Project Type
**WEB** (React + Vite + Supabase)

## Success Criteria
1.  Users can Sign Up/Login and are redirected based on authentication state.
2.  Users have persistent profiles with roles (Admin, Client, Partner).
3.  Users can fill out a form to request licenses for specific products.
4.  License requests are stored in the database (`license_requests` table).
5.  Educational content and EA lists are fetched from the database (`products` table) instead of hardcoded constants.

## Tech Stack
-   **Frontend**: React 19, Vite, TailwindCSS (Existing)
-   **Backend/Auth**: Supabase (Auth, Postgres DB, Row Level Security)
-   **Icons**: Lucide React
-   **State Management**: React Context (AuthProvider)

## File Structure
```
WebApp/
├── .env                  # Environment functions (Supabase credentials)
├── src/
│   ├── lib/
│   │   └── supabase.ts   # Supabase client configuration
│   ├── contexts/
│   │   └── AuthContext.tsx # User session management
│   ├── types.ts          # Updated types for DB schema
│   ├── components/       # Existing components updated
│   │   ├── Auth/         # New Auth components (Login/Register)
│   │   ├── Licenses.tsx  # Updated with DB form
│   │   └── ...
│   └── App.tsx           # Route protection logic
```

## Task Breakdown

### Phase 1: Foundation (Supabase Setup)

#### Task 1.1: Supabase Initialization
-   **Agent**: `app-builder`
-   **Priority**: P0
-   **Input**: Supabase Project URL & Key.
-   **Output**: `.env` file and `lib/supabase.ts` client.
-   **Verify**: `console.log(supabase)` returns client instance without errors.

#### Task 1.2: Authentication System
-   **Agent**: `frontend-specialist`
-   **Priority**: P0
-   **Input**: `AuthContext.tsx`.
-   **Output**: Context provider wrapping App, exposing `user`, `role`, `signIn`, `signOut`.
-   **Verify**: User can log in with email/password (or magic link) and session persists on reload.

### Phase 2: Database & Logic

#### Task 2.1: Database Schema & RLS
-   **Agent**: `database-architect`
-   **Priority**: P0
-   **Input**: SQL definitions for `profiles`, `products`, `license_requests`.
-   **Output**: Tables created in Supabase with RLS policies allowing user access.
-   **Verify**: Admin can select from all tables; Users can only read public products and their own requests/profile.

#### Task 2.2: License Request Feature
-   **Agent**: `frontend-specialist`
-   **Priority**: P1
-   **Input**: `Licenses.tsx` update.
-   **Output**: Form connected to `license_requests` table.
-   **Verify**: Submitting form creates a row in DB; User sees list of their pending requests.

#### Task 2.3: Dynamic Content Migration
-   **Agent**: `frontend-specialist`
-   **Priority**: P2
-   **Input**: `Strategies.tsx`, `Education.tsx`.
-   **Output**: Components fetching data from `products` table.
-   **Verify**: Adding a row to `products` table in Supabase immediately shows up in the UI.

## Phase X: Verification Checklist

-   [ ] **Lint & Build**: `npm run lint && npm run build` passes.
-   [ ] **Security**: RLS policies prevent users from seeing other users' data.
-   [ ] **Functionality**: Login/Logout flow works smoothly.
-   [ ] **Data Integrity**: License requests are correctly linked to the user ID.
