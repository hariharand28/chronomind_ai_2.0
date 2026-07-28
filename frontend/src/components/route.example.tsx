// Example wiring for TanStack Start's file-based router.
// Place this file at: src/routes/dashboard.tsx (or wherever your other
// pages like chat/calendar/reminder live), and drop the /dashboard folder
// contents alongside it (e.g. src/features/dashboard/...).

import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/dashboard/Dashboard";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});
