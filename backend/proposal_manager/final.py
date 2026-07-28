import json

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from reasoning_engine.parser import ReasoningOutput

from .builder import ProposalBuilder
from .manager import ProposalManager
from .proposal import ProposalDecision

app = FastAPI(title="ChronoMind Proposal Manager")


@app.post("/proposal")
async def create_proposal(reasoning_output: ReasoningOutput):

    proposal = ProposalBuilder.build(reasoning_output)

    return JSONResponse(
        {
            "proposal": proposal.model_dump(),
        }
    )


@app.post("/proposal/decision")
async def proposal_decision(decision: ProposalDecision):

    result = ProposalManager.process(decision)

    return JSONResponse(
        {
            "result": result.model_dump(),
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
    )
