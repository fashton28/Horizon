import asyncio
import logging
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from vision_agents.core import User, Agent
from vision_agents.plugins import getstream, gemini

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Interview Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Interview system prompt
INTERVIEWER_INSTRUCTIONS = """
You are a professional and friendly AI interviewer conducting a mock interview practice session.

Your role is to:
1. Greet the candidate warmly and make them feel comfortable
2. Ask relevant interview questions based on the interview type
3. Listen carefully to their answers and ask follow-up questions
4. Provide encouraging feedback while noting areas for improvement
5. Keep your responses concise and conversational (2-3 sentences max)
6. Maintain a professional yet supportive tone throughout

Interview guidelines:
- Start with an introduction and explain what to expect
- Ask one question at a time
- Give the candidate time to think and respond
- Acknowledge good points in their answers
- Gently probe deeper on vague or incomplete answers
- End the interview by summarizing key strengths and areas to work on

Remember: This is a practice session to help the candidate improve. Be constructive and helpful.
"""

TYPE_INSTRUCTIONS = {
    "technical": "\n\nFocus on technical questions: algorithms, data structures, system design, coding concepts, and problem-solving approaches.",
    "behavioral": "\n\nFocus on behavioral questions using the STAR method: Situation, Task, Action, Result. Ask about past experiences, teamwork, leadership, and handling challenges.",
    "system_design": "\n\nFocus on system design questions: architecture, scalability, database design, API design, and trade-offs between different approaches.",
    "product": "\n\nFocus on product/case questions: product thinking, market analysis, user research, feature prioritization, and estimation problems.",
    "general": "\n\nMix of technical and behavioral questions appropriate for a general interview."
}


class JoinRequest(BaseModel):
    call_id: str
    call_type: str = "default"
    interview_type: str = "general"


async def run_agent(call_id: str, call_type: str, interview_type: str):
    """Run the agent in a call."""
    try:
        instructions = INTERVIEWER_INSTRUCTIONS + TYPE_INSTRUCTIONS.get(
            interview_type, TYPE_INSTRUCTIONS["general"]
        )

        llm = gemini.Realtime()
        agent = Agent(
            edge=getstream.Edge(),
            agent_user=User(name="AI Interviewer", id="ai-interviewer"),
            instructions=instructions,
            llm=llm,
        )

        logger.info(f"Agent joining call: {call_type}/{call_id}")

        await agent.create_user()
        call = await agent.create_call(call_type, call_id)

        async with agent.join(call):
            logger.info("Agent joined call, starting interview...")
            await agent.simple_response(
                "Greet the candidate, introduce yourself as their AI interview practice partner, "
                "and explain that this is a safe space to practice. Then begin the interview."
            )
            await agent.finish()

        logger.info(f"Agent finished call: {call_id}")

    except Exception as e:
        logger.error(f"Agent error: {e}")
        raise


@app.post("/join")
async def join_call(request: JoinRequest):
    """Endpoint to trigger agent to join a call."""
    logger.info(f"Received join request for call: {request.call_id}")

    # Run agent in background task
    asyncio.create_task(
        run_agent(request.call_id, request.call_type, request.interview_type)
    )

    return {"status": "ok", "message": f"Agent joining call {request.call_id}"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    port = int(os.getenv("AGENT_PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
