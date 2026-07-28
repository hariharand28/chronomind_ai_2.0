import { motion } from "framer-motion";
import { CalendarClock, FileCheck2, Hourglass, BellRing } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SummaryCardData } from "./types";
import { summaryCardsData } from "./mockData";

const iconMap: Record<SummaryCardData["icon"], typeof CalendarClock> = {
  deadline: CalendarClock,
  proposal: FileCheck2,
  hours: Hourglass,
  reminder: BellRing,
};

interface SummaryCardsProps {
  data?: SummaryCardData[];
}

export function SummaryCards({ data = summaryCardsData }: SummaryCardsProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.map((card, index) => {
        const Icon = iconMap[card.icon];
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
          >
            <Card className="border-white/10 bg-card/50 backdrop-blur transition-colors hover:border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-violet-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground">
                  {card.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </section>
  );
}
