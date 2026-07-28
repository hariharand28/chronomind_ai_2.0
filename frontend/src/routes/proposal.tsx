import { createFileRoute } from "@tanstack/react-router";
import { ProposalReview } from "../components/proposal/ProposalReview";

export const Route = createFileRoute("/proposal")({
  component: ProposalPage,
});

function ProposalPage() {
  return <ProposalReview />;
}