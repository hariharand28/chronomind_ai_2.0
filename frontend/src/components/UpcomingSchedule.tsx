import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScheduleItem } from "./types";
import { upcomingSchedule } from "./mockData";

interface UpcomingScheduleProps {
  items?: ScheduleItem[];
}

export function UpcomingSchedule({ items = upcomingSchedule }: UpcomingScheduleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
    >
      <Card className="border-white/10 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base font-medium">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No study sessions planned for today.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                      <Clock className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.subject} · {item.durationMinutes} min
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 bg-white/5 text-xs">
                    {item.time}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
