import { useState } from "react";
import { motion } from "framer-motion";
import { ProposalSummary } from "./ProposalSummary";
import { ProposalCard } from "./ProposalCard";
import { ProposalActions } from "./ProposalActions";
import { mockProposals } from "./mockProposals";
import type { StudyProposal } from "./proposal";

export function ProposalReview() {
  const [proposals, setProposals] = useState<StudyProposal[]>(mockProposals);

  function handleApprove(id: string) {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p))
    );
  }

  function handleReject(id: string) {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "rejected" } : p))
    );
  }

  function handleEdit(
    id: string,
    updates: { studyTime: string; deadline: string }
  ) {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }

  function handleApproveAll() {
    setProposals((prev) =>
      prev.map((p) => (p.status === "pending" ? { ...p, status: "approved" } : p))
    );
  }

  function handleRegenerate() {
    setProposals(mockProposals.map((p) => ({ ...p, status: "pending" })));
  }

  const hasPending = proposals.some((p) => p.status === "pending");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Proposal Review
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the study plan ChronoMind AI generated from your syllabus..
          </p>
        </motion.div>

        <ProposalSummary proposals={proposals} />

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {proposals.map((proposal, index) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              index={index}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={handleEdit}
            />
          ))}
        </section>

        <ProposalActions
          onApproveAll={handleApproveAll}
          onRegenerate={handleRegenerate}
          disabled={!hasPending}
        />
      </div>
    </div>
  );
}

export default ProposalReview;
