# Task: Implement Gamified User Journey (Onboarding)

## Overview
Implement a "Journey" (Trilha) session to guide new users through the setup process. This is a gamified onboarding experience involving a roadmap with specific steps.

## Requirements
1.  **Entry Point**: Add a "Comece por aqui" (Start Here) card on the User Dashboard.
2.  **Journey View**: Create a new view/page called "Journey" (`Trilha`).
3.  **Roadmap Steps**:
    *   **Step 1**: Introduction (User knows AFK Trade).
    *   **Step 2**: Broker Selection (Choose partner broker & open account).
    *   **Step 3**: Deposit (Deposit capital).
    *   **Step 4**: Strategy (Connect to a strategy).
4.  **Interactivity**:
    *   Visual progress indicator (timeline/stepper).
    *   Action buttons for each step (e.g., "Ver Tutorial", "Escolher Corretora").
5.  **Architecture**:
    *   Update `App.tsx` to handle the new `journey` view.
    *   Update `types.ts` to include `journey` in `View` type.
    *   Create `components/Journey.tsx`.
    *   Update `components/Dashboard/UserDashboard.tsx` to add the entry card.

## Implementation Steps
1.  [ ] Create `components/Journey.tsx` with the roadmap UI.
2.  [ ] Update `types.ts` to add `journey` view type.
3.  [ ] Update `App.tsx` to route to `Journey` component.
4.  [ ] Update `components/Dashboard/UserDashboard.tsx` to add the "Start Here" card.
5.  [ ] Verify navigation and responsiveness.
6.  [ ] Git Process (Add, Commit, Push).
