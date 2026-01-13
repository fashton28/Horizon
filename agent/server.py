import asyncio
import logging
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from vision_agents.core import User, Agent
from vision_agents.plugins import getstream, gemini, smart_turn
from google.genai.types import (
    LiveConnectConfigDict,
    SpeechConfigDict,
    VoiceConfigDict,
    PrebuiltVoiceConfigDict,
    Modality,
    AudioTranscriptionConfigDict,
    RealtimeInputConfigDict,
    TurnCoverage,
    ContextWindowCompressionConfigDict,
    SlidingWindowDict,
)

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

# Interview system prompts by language
INTERVIEWER_INSTRUCTIONS = {
    "en": """You are a professional and friendly AI interviewer conducting a mock interview practice session.

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

Remember: This is a practice session to help the candidate improve. Be constructive and helpful.""",

    "es": """Eres un entrevistador de IA profesional y amigable que realiza una sesion de practica de entrevistas.

Tu rol es:
1. Saludar al candidato calidamente y hacerlo sentir comodo
2. Hacer preguntas de entrevista relevantes segun el tipo de entrevista
3. Escuchar atentamente sus respuestas y hacer preguntas de seguimiento
4. Proporcionar retroalimentacion alentadora mientras notas areas de mejora
5. Mantener tus respuestas concisas y conversacionales (2-3 oraciones maximo)
6. Mantener un tono profesional pero solidario

Pautas de la entrevista:
- Comienza con una introduccion y explica que esperar
- Haz una pregunta a la vez
- Dale tiempo al candidato para pensar y responder
- Reconoce los puntos buenos en sus respuestas
- Profundiza suavemente en respuestas vagas o incompletas
- Termina la entrevista resumiendo fortalezas clave y areas de mejora

Recuerda: Esta es una sesion de practica para ayudar al candidato a mejorar. Se constructivo y util.
IMPORTANTE: Conduce toda la entrevista en espanol.""",

    "bilingual": """You are a professional and friendly AI interviewer conducting a mock interview practice session.
You are bilingual (English/Spanish) and will help the candidate practice in both languages.

Your role is:
1. Greet the candidate warmly in English, then repeat in Spanish
2. Ask interview questions primarily in English
3. Occasionally include Spanish phrases or ask the candidate to respond in Spanish
4. When giving feedback, include key terms in both languages
5. Keep responses concise (2-3 sentences max)
6. Help the candidate build confidence in both languages

Interview guidelines:
- Start with a bilingual introduction
- Ask questions in English but accept answers in either language
- Provide vocabulary tips when relevant (e.g., "In Spanish, we'd say...")
- Encourage the candidate to try answering in Spanish periodically
- End with a summary in both languages

Remember: This is a practice session for both interview skills AND language practice. Be encouraging!"""
}

TYPE_INSTRUCTIONS = {
    "en": {
        "technical": "\n\nFocus on technical questions: algorithms, data structures, system design, coding concepts, and problem-solving approaches.",
        "behavioral": "\n\nFocus on behavioral questions using the STAR method: Situation, Task, Action, Result. Ask about past experiences, teamwork, leadership, and handling challenges.",
        "system_design": "\n\nFocus on system design questions: architecture, scalability, database design, API design, and trade-offs between different approaches.",
        "product": "\n\nFocus on product/case questions: product thinking, market analysis, user research, feature prioritization, and estimation problems.",
        "general": "\n\nMix of technical and behavioral questions appropriate for a general interview."
    },
    "es": {
        "technical": "\n\nEnfocate en preguntas tecnicas: algoritmos, estructuras de datos, diseno de sistemas, conceptos de programacion y enfoques de resolucion de problemas.",
        "behavioral": "\n\nEnfocate en preguntas conductuales usando el metodo STAR: Situacion, Tarea, Accion, Resultado. Pregunta sobre experiencias pasadas, trabajo en equipo, liderazgo y manejo de desafios.",
        "system_design": "\n\nEnfocate en preguntas de diseno de sistemas: arquitectura, escalabilidad, diseno de bases de datos, diseno de APIs y compensaciones entre diferentes enfoques.",
        "product": "\n\nEnfocate en preguntas de producto/caso: pensamiento de producto, analisis de mercado, investigacion de usuarios, priorizacion de caracteristicas y problemas de estimacion.",
        "general": "\n\nMezcla de preguntas tecnicas y conductuales apropiadas para una entrevista general."
    },
    "bilingual": {
        "technical": "\n\nFocus on technical questions (algoritmos, estructuras de datos). Include key technical terms in both English and Spanish.",
        "behavioral": "\n\nFocus on behavioral questions using STAR method. Ask some questions in Spanish to practice professional vocabulary.",
        "system_design": "\n\nFocus on system design questions. Teach relevant technical vocabulary in both languages as you go.",
        "product": "\n\nFocus on product/case questions. Mix languages to help build business vocabulary in Spanish.",
        "general": "\n\nMix of technical and behavioral questions. Alternate between languages to maximize practice."
    }
}

# Language codes for Gemini
LANGUAGE_CODES = {
    "en": "en-US",
    "es": "es-ES",
    "bilingual": "en-US"  # Primary language for bilingual mode
}

# Opening prompts by language
OPENING_PROMPTS = {
    "en": "Greet the candidate, introduce yourself as their AI interview practice partner, and explain that this is a safe space to practice. Then begin the interview.",
    "es": "Saluda al candidato en espanol, presentate como su companero de practica de entrevistas de IA, y explica que este es un espacio seguro para practicar. Luego comienza la entrevista.",
    "bilingual": "Greet the candidate in both English and Spanish, introduce yourself as their bilingual AI interview practice partner, explain you'll help them practice in both languages. Then begin the interview."
}


class JoinRequest(BaseModel):
    call_id: str
    call_type: str = "default"
    interview_type: str = "general"
    language: str = "en"
    voice: str = "Puck"


def create_voice_config(voice_name: str) -> LiveConnectConfigDict:
    """Create Gemini Live config with the specified voice."""
    return LiveConnectConfigDict(
        response_modalities=[Modality.AUDIO],
        input_audio_transcription=AudioTranscriptionConfigDict(),
        output_audio_transcription=AudioTranscriptionConfigDict(),
        speech_config=SpeechConfigDict(
            voice_config=VoiceConfigDict(
                prebuilt_voice_config=PrebuiltVoiceConfigDict(voice_name=voice_name)
            ),
        ),
        realtime_input_config=RealtimeInputConfigDict(
            turn_coverage=TurnCoverage.TURN_INCLUDES_ONLY_ACTIVITY
        ),
        context_window_compression=ContextWindowCompressionConfigDict(
            trigger_tokens=25600,
            sliding_window=SlidingWindowDict(target_tokens=12800),
        ),
    )


async def run_agent(call_id: str, call_type: str, interview_type: str, language: str = "en", voice: str = "Puck"):
    """Run the agent in a call."""
    try:
        # Get language-specific instructions
        base_instructions = INTERVIEWER_INSTRUCTIONS.get(language, INTERVIEWER_INSTRUCTIONS["en"])
        type_instructions = TYPE_INSTRUCTIONS.get(language, TYPE_INSTRUCTIONS["en"])
        type_specific = type_instructions.get(interview_type, type_instructions["general"])
        instructions = base_instructions + type_specific

        # Get opening prompt for the language
        opening_prompt = OPENING_PROMPTS.get(language, OPENING_PROMPTS["en"])

        logger.info(f"Configuring agent for language: {language}, voice: {voice}")

        # Configure turn detection for balanced latency
        turn_detection = smart_turn.TurnDetection(
            silence_duration_ms=1000,
            speech_probability_threshold=0.4
        )

        # Configure Gemini with selected voice
        voice_config = create_voice_config(voice)
        llm = gemini.Realtime(config=voice_config)

        # Set agent name based on language
        agent_name = {
            "en": "AI Interviewer",
            "es": "Entrevistador IA",
            "bilingual": "AI Interviewer / Entrevistador IA"
        }.get(language, "AI Interviewer")

        agent = Agent(
            edge=getstream.Edge(),
            agent_user=User(name=agent_name, id="ai-interviewer"),
            instructions=instructions,
            llm=llm,
            turn_detection=turn_detection,
        )

        logger.info(f"Agent joining call: {call_type}/{call_id} (language: {language})")

        await agent.create_user()
        call = await agent.create_call(call_type, call_id)

        async with agent.join(call):
            logger.info("Agent joined call, starting interview...")
            await agent.simple_response(opening_prompt)
            await agent.finish()

        logger.info(f"Agent finished call: {call_id}")

    except Exception as e:
        logger.error(f"Agent error: {e}")
        raise


@app.post("/join")
async def join_call(request: JoinRequest):
    """Endpoint to trigger agent to join a call."""
    logger.info(f"Received join request for call: {request.call_id} (language: {request.language}, voice: {request.voice})")

    # Run agent in background task
    asyncio.create_task(
        run_agent(request.call_id, request.call_type, request.interview_type, request.language, request.voice)
    )

    return {"status": "ok", "message": f"Agent joining call {request.call_id} in {request.language} with voice {request.voice}"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    port = int(os.getenv("AGENT_PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
