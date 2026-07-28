import { createFileRoute } from "@tanstack/react-router";

import { WelcomeSection } from "../components/WelcomeSection";
import { SummaryCards } from "../components/SummaryCards";
import { QuickActions } from "../components/QuickActions";
import { RecentActivity } from "../components/RecentActivity";
import { UpcomingSchedule } from "../components/UpcomingSchedule";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <WelcomeSection />

        <SummaryCards />

        <QuickActions />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentActivity />
          <UpcomingSchedule />
        </div>
      </div>
    </div>
  );
}