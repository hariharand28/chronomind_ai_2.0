import { motion } from "framer-motion";
import { Upload, FileCheck2, BellRing } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityItem } from "./types";
import { recentActivity } from "./mockData";

const iconMap: Record<ActivityItem["type"], typeof Upload> = {
  upload: Upload,
  proposal: FileCheck2,
  reminder: BellRing,
};

interface RecentActivityProps {
  items?: ActivityItem[];
}

export function RecentActivity({ items = recentActivity }: RecentActivityProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
    >
      <Card className="border-white/10 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative flex flex-col gap-5 border-l border-white/10 pl-5">
            {items.map((item) => {
              const Icon = iconMap[item.type];
              return (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[26px] flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 ring-4 ring-card">
                    <Icon className="h-3 w-3 text-violet-400" />
                  </span>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground/70">
                    {item.timestamp}
                  </p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </motion.div>
  );
}
