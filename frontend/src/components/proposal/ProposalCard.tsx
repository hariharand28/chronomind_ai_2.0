import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Pencil, AlertTriangle, Clock3, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProposalPriority, StudyProposal } from "../types/proposal";

const priorityStyles: Record<ProposalPriority, string> = {
  High: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

interface ProposalCardProps {
  proposal: StudyProposal;
  index?: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string, updates: { studyTime: string; deadline: string }) => void;
}

export function ProposalCard({
  proposal,
  index = 0,
  onApprove,
  onReject,
  onEdit,
}: ProposalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [studyTime, setStudyTime] = useState(proposal.studyTime);
  const [deadline, setDeadline] = useState(proposal.deadline);

  const isDecided = proposal.status !== "pending";

  function handleSave() {
    onEdit(proposal.id, { studyTime, deadline });
    setIsEditing(false);
  }

  function handleCancel() {
    setStudyTime(proposal.studyTime);
    setDeadline(proposal.deadline);
    setIsEditing(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <Card
        className={`border-white/10 bg-card/50 backdrop-blur transition-opacity ${
          proposal.status === "rejected" ? "opacity-50" : ""
        }`}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {proposal.subject}
            </h3>
            {proposal.hasConflict && (
              <div className="mt-1 flex items-center gap-1 text-xs text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Schedule conflict detected
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={priorityStyles[proposal.priority]}>
              {proposal.priority}
            </Badge>
            {proposal.status !== "pending" && (
              <Badge
                variant="secondary"
                className={
                  proposal.status === "approved"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-white/5 text-muted-foreground"
                }
              >
                {proposal.status === "approved" ? "Approved" : "Rejected"}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {isEditing ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Study time</label>
                <Input
                  value={studyTime}
                  onChange={(e) => setStudyTime(e.target.value)}
                  className="h-8 bg-background/50 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Deadline</label>
                <Input
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-8 bg-background/50 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock3 className="h-4 w-4 text-violet-400" />
                <span>{proposal.studyTime}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarClock className="h-4 w-4 text-violet-400" />
                <span>Due {proposal.deadline}</span>
              </div>
            </div>
          )}

          <p className="rounded-lg border border-white/5 bg-white/[0.03] p-3 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-violet-400">AI reason: </span>
            {proposal.aiReason}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Estimated duration: {proposal.estimatedDuration}</span>
          </div>

          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-500" onClick={handleSave}>
                Save changes
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="gap-1 bg-emerald-600 hover:bg-emerald-500"
                disabled={isDecided}
                onClick={() => onApprove(proposal.id)}
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1"
                disabled={isDecided}
                onClick={() => onReject(proposal.id)}
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="gap-1 border border-white/10 bg-white/5"
                disabled={isDecided}
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
