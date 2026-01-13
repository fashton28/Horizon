import logging
from dotenv import load_dotenv
from vision_agents.core import User, Agent, cli
from vision_agents.core.agents import AgentLauncher
from vision_agents.plugins import getstream, gemini

logger = logging.getLogger(__name__)
load_dotenv()

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


async def create_agent(**kwargs) -> Agent:
    """Create and configure the AI interviewer agent."""
    interview_type = kwargs.get("interview_type", "general")

    # Customize instructions based on interview type
    type_specific_instructions = {
        "technical": "\n\nFocus on technical questions: algorithms, data structures, system design, coding concepts, and problem-solving approaches.",
        "behavioral": "\n\nFocus on behavioral questions using the STAR method: Situation, Task, Action, Result. Ask about past experiences, teamwork, leadership, and handling challenges.",
        "system_design": "\n\nFocus on system design questions: architecture, scalability, database design, API design, and trade-offs between different approaches.",
        "product": "\n\nFocus on product/case questions: product thinking, market analysis, user research, feature prioritization, and estimation problems.",
        "general": "\n\nMix of technical and behavioral questions appropriate for a general interview."
    }

    instructions = INTERVIEWER_INSTRUCTIONS + type_specific_instructions.get(interview_type, type_specific_instructions["general"])

    llm = gemini.Realtime()
    agent = Agent(
        edge=getstream.Edge(),
        agent_user=User(name="AI Interviewer", id="ai-interviewer"),
        instructions=instructions,
        llm=llm,
    )

    return agent


async def join_call(agent: Agent, call_type: str, call_id: str, **kwargs):
    """Join a call and conduct the interview."""
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


if __name__ == "__main__":
    cli(AgentLauncher(create_agent=create_agent, join_call=join_call))
