
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

## Conventions

- **File Naming:** Use camelCase for JavaScript files (e.g., `taskActions.js`).
- **Code Style:** Follow standard JavaScript conventions.
- **API Endpoints:** API routes are defined in the `backend/routes/` directory and should follow a RESTful structure.
- **Modularity:** The frontend code is organized into modules in the `frontend/modules/` directory. Each module should have a specific responsibility (e.g., UI, state management).

## Future Goals

The primary goal is to make the application highly customizable. Future development should focus on adding a settings view where users can:

- Toggle features like "swipe to snooze" and "priority schedule".
- Switch between light and dark themes.
- Create, edit, and delete custom task lists.
