import { createFileRoute } from "@tanstack/react-router";
import ProposalReviewPage from "@/components/proposal/ProposalReviewPage";

export const Route = createFileRoute("/proposal")({
  component: ProposalRoute,
});

function ProposalRoute() {
  const stored = sessionStorage.getItem("proposal");

  if (!stored) {
    return (
      <div className="flex h-full items-center justify-center">
        <h2 className="text-xl font-semibold">
          No proposal found.
        </h2>
      </div>
    );
  }

  const proposal = JSON.parse(stored);

  return (
    <ProposalReviewPage
      proposal={proposal}
      onAccept={async () => {
  try {
    const response = await fetch("http://localhost:8000/decide", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proposal_id: proposal.id,
        decision: "accept",
        feedback: "",
      }),
    });

    const result = await response.json();

    console.log(result);

    alert("Proposal accepted successfully!");

    sessionStorage.removeItem("proposal");

    window.location.href = "/dashboard";
  } catch (err) {
    console.error(err);
    alert("Failed to accept proposal.");
  }
}}
      onReject={async () => {
  const feedback = prompt("Reason for rejecting this proposal?");

  if (feedback === null) return;

  try {
    const response = await fetch("http://localhost:8000/decide", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proposal_id: proposal.id,
        decision: "reject",
        feedback,
      }),
    });

    const result = await response.json();

    console.log(result);

    if (result.result.status === "replan") {
      sessionStorage.setItem(
        "proposal",
        JSON.stringify(result.result.proposal)
      );

      window.location.reload();
    } else if (result.result.status === "manual_review") {
      alert("Proposal requires manual review.");
    }
  } catch (err) {
    console.error(err);
    alert("Failed to reject proposal.");
  }
}}
      isSubmitting={false}
    />
  );
}