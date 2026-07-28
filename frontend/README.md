# Chronomind — Frontend

Chronomind is an intelligent student planner and AI agent. This repository contains the **frontend application**, responsible for the presentation layer, user interaction, and communication with the FastAPI Python backend.

---

## 📑 Table of Contents

- [Tech Stack](#-tech-stack)
- [Architecture Overview](#️-architecture-overview)
- [Folder Structure](#-folder-structure)
- [Detailed File Breakdown](#-detailed-file-breakdown)
  - [`src/assets/`](#srcassets)
  - [`src/components/`](#srccomponents)
  - [`src/hooks/`](#srchooks)
  - [`src/lib/`](#srclib--utilities--state)
  - [`src/routes/`](#srcroutes--the-application-pages)
  - [Configuration & Bootstrapping](#️-configuration--bootstrapping)
- [Notes](#-notes)

---

## 🚀 Tech Stack

| Category         | Technology                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| Framework        | [TanStack Start](https://tanstack.com/start/latest) (Full-stack SSR, React) |
| Routing          | TanStack Router (file-based routing)                                        |
| Styling          | Tailwind CSS v4                                                             |
| Components       | [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives)                   |
| State & Fetching | TanStack Query (React Query)                                                |
| Package Manager  | Bun                                                                         |

---

## 🗺️ Architecture Overview

The Chronomind frontend acts as the primary interface for a complex AI architecture. It communicates via an API Gateway to a FastAPI backend containing several core layers:

1. **Ingestion Layer** — Receives text and documents (PDFs, images) from the chat interface, running OCR when necessary.
2. **Reasoning Engine** — Processes inputs using LangChain and LLMs to generate structured outputs.
3. **Proposal Manager** — Handles decision-making and refinement of AI actions.
4. **Background Manager** — Manages memory, detects context deltas, and will eventually push Server-Sent Events (SSE) to the frontend.
5. **External APIs** — Google Calendar and Google Tasks/Reminders integration.

> **Note:** The frontend currently relies on local mock data (`src/lib/mock-data.ts`) while the backend integration is being finalized.

---

## 📂 Folder Structure

```text
src/
├── assets/              # Static assets (logos, images)
├── components/          # React components
│   ├── ui/               # Standardized shadcn/ui building blocks (buttons, dialogs, inputs)
│   ├── app-sidebar.tsx    # Main application navigation
│   └── theme-toggle.tsx  # Dark/Light mode switcher
├── hooks/               # Custom React hooks (e.g., use-mobile)
├── lib/                 # Utilities and helpers
│   ├── mock-data.ts      # Dummy data for Chat, Calendar, and Reminders (to be replaced with real API calls)
│   └── utils.ts          # Tailwind class merging utility (cn)
├── routes/              # File-based routing (TanStack Router)
│   ├── __root.tsx         # Master layout, providers, and global error handling
│   ├── index.tsx          # Entry point (redirects to /chat)
│   ├── chat.tsx           # AI Assistant interface and file upload
│   ├── calendar.tsx       # Event management view
│   └── reminders.tsx      # Task management view
├── router.tsx           # TanStack Router configuration
├── server.ts            # SSR server entry point
├── start.ts             # Application initialization
└── styles.css           # Global CSS and Tailwind directives
```

---

## 📖 Detailed File Breakdown

### `src/assets/`

| File       | Description                                                                           |
| ---------- | ------------------------------------------------------------------------------------- |
| `logo.png` | The primary branding asset used in the sidebar and empty state of the chat interface. |

### `src/components/`

| File               | Description                                                                                                                                                                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/` (directory)  | Contains all raw **shadcn/ui** components (e.g., `button.tsx`, `dialog.tsx`, `input.tsx`). These are accessible, highly customizable, and copy-pasted directly into the project rather than installed as an npm package. **You rarely need to edit these** unless fundamentally changing the design system. |
| `app-sidebar.tsx`  | The main navigation menu. Uses TanStack Router's `useRouterState` to detect the current URL and highlight the active tab. Also maps over `seedConversations` to display recent chat history.                                                                                                                |
| `theme-toggle.tsx` | A smart component that switches the app between light and dark mode. Toggles the `.dark` class on the root `<html>` element and persists the user's choice in `localStorage`.                                                                                                                               |

### `src/hooks/`

| File             | Description                                                                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `use-mobile.tsx` | A standard shadcn/ui hook that listens to the window resize event. Returns a boolean (`true` if the screen is mobile-sized), which the sidebar uses to automatically collapse into a hamburger menu on smaller screens. |

### `src/lib/` — Utilities & State

| File                                 | Description                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mock-data.ts`                       | Currently the most critical file for understanding data flow. Defines the TypeScript interfaces (`UIMessage`, `CalendarEvent`, `Reminder`) that dictate the exact shape of data the frontend expects, and exports the dummy data arrays used to populate the UI. **When you connect your database, reference these types to ensure your FastAPI backend returns the correct JSON structures.** |
| `utils.ts`                           | Contains the `cn()` function, combining `clsx` (conditional classes) and `tailwind-merge` (resolving conflicting Tailwind utility classes) so dynamic styling works predictably.                                                                                                                                                                                                               |
| `error-capture.ts` / `error-page.ts` | Utility files required by TanStack Start's SSR implementation to capture out-of-band server errors and render a fallback HTML page if the React tree completely crashes during server-side rendering.                                                                                                                                                                                          |

### `src/routes/` — The Application Pages

| Route           | Description                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__root.tsx`    | The master wrapper for the entire application. **Responsibilities:** injects the `<html>`, `<head>`, and `<body>` tags; wraps the `<Outlet/>` (child pages) inside `<QueryClientProvider>` (API fetching) and `<SidebarProvider>` (layout). **Error handling:** defines the global `ErrorComponent` and `NotFoundComponent` (404 page) to catch missing pages or runtime crashes.                                                            |
| `index.tsx`     | The root URL (`/`). Contains a simple TanStack Router `beforeLoad` hook that immediately redirects to `/chat`.                                                                                                                                                                                                                                                                                                                               |
| `chat.tsx`      | The AI Assistant interface. **State:** manages conversation history (`messages`), text input (`input`), and uploaded files (`files`) via React `useState`. **Logic:** the `send()` function constructs a `FormData` object and makes a `POST` request to the local Python API (`http://127.0.0.1:8000/ingest`). **Rendering:** uses `react-markdown` to parse AI responses and dynamically renders file attachment icons based on MIME type. |
| `calendar.tsx`  | The schedule management view. **State:** uses `date-fns` to filter the local events array against the currently selected day. **UI:** features a fully interactive calendar widget and a dialog form to create new events (currently saved only to local React state).                                                                                                                                                                       |
| `reminders.tsx` | The task tracking view. **State:** manages tasks with an added `tab` state to filter between "All", "Upcoming", and "Completed". **UI:** uses a tabbed layout, checkboxes to toggle completion status, and dynamic Tailwind classes to color-code task priority levels (Low, Medium, High).                                                                                                                                                  |

### ⚙️ Configuration & Bootstrapping

| File                     | Description                                                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `router.tsx`             | Instantiates the TanStack Router. Takes the route tree and creates a type-safe routing object used by the application.                                                                                      |
| `routeTree.gen.ts`       | **Do not edit this file.** Automatically generated and updated by TanStack Router whenever a file is added, removed, or renamed in `src/routes/`.                                                           |
| `start.ts` / `server.ts` | The entry points for the TanStack Start application. Configure the underlying Vinxi server to handle Server-Side Rendering (SSR) and deliver the initial HTML payload to the browser before React hydrates. |
| `styles.css`             | The global stylesheet. Imports Tailwind CSS v4 and contains the `@theme` and `:root` blocks defining the `oklch` color variables and custom border radii.                                                   |

---

## 📝 Notes

- The frontend currently depends on **mock data** (`src/lib/mock-data.ts`) rather than live backend calls, aside from the chat interface's `/ingest` endpoint integration.
- When wiring up new backend endpoints, always cross-reference the TypeScript interfaces in `mock-data.ts` first to keep frontend/backend contracts in sync.
- Do not manually edit `routeTree.gen.ts` — it is regenerated automatically by TanStack Router.
