from .proposal import (
    ProposalDecision,
    ProposalResult,
)


class ProposalManager:
    @staticmethod
    def process(
        decision: ProposalDecision,
    ) -> ProposalResult:

        if decision.action == "accept":
            return ProposalResult(
                status="accepted",
                proposal=decision.proposal,
            )

        if decision.action == "reject":
            return ProposalResult(
                status="replan",
                feedback=decision.feedback,
            )

        raise ValueError("Unknown proposal action.")
