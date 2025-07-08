# Gemini Project Configuration

This document provides guidance for interacting with the Task Lab project, ensuring that changes align with its architecture, conventions, and goals.

## Project Overview

Task Lab is a task management application designed to be highly customizable. The user can toggle features, change themes, and manage lists to tailor the app to their workflow.

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3
- **Backend:** Node.js with Express.js
- **Database:** (Not specified, but likely MongoDB or a similar NoSQL database given the `.js` models)
- **Deployment:** GitHub Actions

## Architecture

The project is a monorepo with two main components:

- **`frontend/`**: A client-side application that interacts with the backend API. It is structured with modules for state management, UI rendering, and task-related actions. It also includes service workers for PWA functionality.
- **`backend/`**: A Node.js/Express.js server that provides a RESTful API for the frontend. It handles business logic, data storage, and user authentication.

### Offline-First Architecture

Task Lab is a fully offline-capable Progressive Web App (PWA). It uses an **offline-first** (or cache-first) strategy, where the application's primary data source is a local database, providing a seamless and instant user experience regardless of network connectivity.

-   **Local Database (`frontend/modules/localDb.js`):** All tasks are stored in an IndexedDB database in the browser. This is the single source of truth for the UI. All user actions (adding, editing, deleting tasks) are performed directly on this local database, resulting in immediate UI updates.

-   **Synchronization (`frontend/modules/taskActions.js`):** After an action is performed locally, the application sends a corresponding request to the server API. This synchronization happens in the background. If the user is offline, these requests are queued and will be retried later by the service worker.

-   **Service Worker (`frontend/sw.js`):** The service worker's primary roles in this architecture are:
    1.  **Caching the App Shell:** On installation, it caches all necessary static assets (HTML, CSS, JS) to allow the app to load without a network connection.
    2.  **Background Sync:** It listens for a `sync` event, which is triggered by the browser when network connectivity is restored. It then processes a queue of failed network requests, ensuring that any changes made offline are eventually sent to the server.

-   **Data Flow on Load:** When the application starts, it attempts to fetch the latest tasks from the server. If successful, it updates the local IndexedDB with this fresh data. If the network request fails, the application continues to function with the data already stored locally. In either case, the UI is always rendered from the fast, local IndexedDB.

## Conventions

- **File Naming:** Use camelCase for JavaScript files (e.g., `taskActions.js`).
- **Code Style:** Follow standard JavaScript conventions.
- **API Endpoints:** API routes are defined in the `backend/routes/` directory and should follow a RESTful structure.
- **Modularity:** The frontend code is organized into modules in the `frontend/modules/` directory. Each module should have a specific responsibility (e.g., UI, state management, local database).

## Major Features

-   **Add Task:** Allows users to create new tasks with details such as title, description, due date, and priority.
-   **Complete Task:** Marks a task as finished, moving it from the active task list.
-   **Edit Task:** Enables users to modify the details of an existing task.
-   **Delete Task:** Removes a task permanently from the system.
-   **Swipe Task:** A gesture-based interaction (e.g., swipe left/right) to quickly perform actions like completing, snoozing, or deleting a task.
-   **Snooze Task:** Temporarily hides a task and reminds the user about it at a later, specified time.
-   **Priority Schedule:** A feature that helps users organize tasks based on their priority levels, potentially integrating with scheduling tools.
-   **Notifications:** Provides timely alerts and reminders for tasks, due dates, or other important events.
-   **User-defined Lists:** Users can create, manage, and assign tasks to custom lists, which are stored both locally and on the server.

## Major Views

-   **Authentication View:** Handles user login, registration, and password recovery.
-   **Dashboard View:** The main landing page after authentication, displaying an overview of upcoming tasks, summaries, and quick actions. Now filters tasks by user-selected lists and hides completed/snoozed tasks.
-   **Browse All View:** Allows users to view and manage all their tasks, potentially with filtering and sorting options.
-   **Settings View:** Provides options for users to customize application settings, such as themes, notification preferences, and feature toggles. Now includes management for user-defined lists.
-   **Add Task View:** A dedicated interface for creating new tasks. Now clears input fields after task creation and defaults to the currently selected list.
-   **Edit Task View:** An interface for modifying the details of an existing task.

## Future Goals

The primary goal is to make the application highly customizable. Future development should focus on adding a settings view where users can:

- Toggle features like "swipe to snooze" and "priority schedule".
- Switch between light and dark themes.
- Further enhance list management capabilities (e.g., reordering lists, sharing lists).