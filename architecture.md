# SkillBridge - AI Interview Practice Platform

## Project Overview

SkillBridge is an AI-powered mock interview practice platform where users can join video/audio meetings with an AI interviewer. The AI conducts realistic interview sessions in multiple languages (English, Spanish, Bilingual) across different interview types (Technical, Behavioral, System Design, Product, General).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │    Dashboard    │    │   Meeting Room  │    │   Components    │  │
│  │  - SaaS layout  │    │ - Stream Video  │    │ - shadcn/ui     │  │
│  │  - CMD+K search │    │ - WebRTC calls  │    │ - 50+ components│  │
│  │  - Tag picker   │    │ - Call controls │    │ - Tailwind CSS  │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTP/REST
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                              │
│  ┌─────────────────────────┐    ┌─────────────────────────────────┐ │
│  │  /api/meeting/create    │    │  /api/stream/token              │ │
│  │  - Create Stream call   │    │  - Generate user JWT tokens     │ │
│  │  - Trigger AI agent     │    │                                 │ │
│  └───────────┬─────────────┘    └─────────────────────────────────┘ │
└──────────────┼──────────────────────────────────────────────────────┘
               │ HTTP POST /join
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Python Agent Server (FastAPI)                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Vision Agents Framework                                        ││
│  │  - Gemini Live (native real-time audio: STT + LLM + TTS)       ││
│  │  - Smart Turn Detection (1s silence, 0.4 threshold)            ││
│  │  - Stream Video integration (WebRTC)                           ││
│  │  - Multi-language system prompts                               ││
│  └─────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ WebRTC
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Stream Video Cloud                              │
│  - WebRTC infrastructure        - Call management                    │
│  - Real-time audio/video        - Participant handling              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework with App Router |
| React | 19 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first CSS |
| shadcn/ui | - | 50+ pre-built components (Radix UI based) |
| TanStack Query | 5.x | Server state management |
| Stream Video React SDK | 1.31.0 | WebRTC video/audio UI components |
| cmdk | 1.1.1 | Command palette (⌘K) |
| Lucide React | - | Icons |

### Backend (Next.js API Routes)

| Technology | Purpose |
|------------|---------|
| Stream Node SDK | Server-side call management & token generation |
| Drizzle ORM | Database ORM (prepared for Phase 2) |
| NeonDB | Serverless PostgreSQL (prepared for Phase 2) |

### Python Agent Server

| Technology | Purpose |
|------------|---------|
| FastAPI | REST API server |
| Uvicorn | ASGI server |
| Vision Agents | AI voice agent framework |
| Gemini Live | Real-time voice AI (STT + LLM + TTS combined) |
| GetStream Plugin | WebRTC integration with Stream Video |

---

## Directory Structure

```
/aimeeting
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Main dashboard (SaaS layout)
│   │   ├── meeting/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Meeting room page
│   │   └── api/
│   │       ├── meeting/
│   │       │   └── create/
│   │       │       └── route.ts    # Create meeting endpoint
│   │       └── stream/
│   │           └── token/
│   │               └── route.ts    # Generate Stream tokens
│   ├── components/
│   │   ├── ui/                     # 50+ shadcn/ui components
│   │   ├── meeting/
│   │   │   ├── MeetingRoom.tsx     # Video call UI
│   │   │   └── MeetingSetup.tsx    # Pre-join screen
│   │   └── providers/
│   │       ├── QueryProvider.tsx   # TanStack Query
│   │       └── StreamProvider.tsx  # Stream Video client
│   ├── lib/
│   │   ├── stream.ts               # Stream server utilities
│   │   └── utils.ts                # Helper functions
│   └── db/
│       ├── index.ts                # Database connection
│       └── schema.ts               # Drizzle schema
│
├── agent/
│   ├── server.py                   # FastAPI agent server
│   ├── requirements.txt            # Python dependencies
│   ├── venv/                       # Python virtual environment
│   └── .env                        # Agent environment variables
│
├── .env.local                      # Next.js environment variables
└── package.json
```

---

## Data Flow

### Creating a Meeting

1. User clicks "New Meeting" → Opens tag-picker modal
2. User selects interview type + language → Clicks "Start Session"
3. Frontend `POST /api/meeting/create` with `{ interviewType, language, userId }`
4. API creates Stream call via `@stream-io/node-sdk`
5. API triggers Python agent: `POST http://localhost:8001/join`
6. API returns `{ callId, token }` → User redirected to `/meeting/[callId]`

### In the Meeting

1. User joins via Stream Video React SDK (WebRTC)
2. Python agent joins same call via Vision Agents
3. Gemini Live handles real-time conversation:
   - Listens to user speech (STT)
   - Generates response (LLM)
   - Speaks response (TTS)
4. Smart Turn Detection manages conversation flow (1s silence threshold)

---

## Environment Variables

```env
# .env.local (Next.js)
STREAM_API_KEY=xxx
STREAM_API_SECRET=xxx
NEXT_PUBLIC_STREAM_API_KEY=xxx

# agent/.env (Python)
STREAM_API_KEY=xxx
STREAM_API_SECRET=xxx
GOOGLE_API_KEY=xxx  # Gemini API
```

---

## Key Features

| Feature | Status |
|---------|--------|
| AI Voice Interviewer | ✅ Working |
| Multi-language (EN/ES/Bilingual) | ✅ Working |
| Interview Types (5 types) | ✅ Working |
| Smart Turn Detection | ✅ Optimized |
| SaaS Dashboard Layout | ✅ Complete |
| CMD+K Command Palette | ✅ Complete |
| Tag-picker Modal | ✅ Complete |
| Session History | 🔜 Phase 2 (needs DB) |
| Meeting Summaries | 🔜 Phase 2 |
| User Authentication | 🔜 Phase 2 |

---

## Running the Project

### Prerequisites

- Node.js 18+
- Python 3.11+
- Stream Video account
- Google AI (Gemini) API key

### Development

```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start Python agent
cd agent
source venv/bin/activate
python server.py
```

The app will be available at `http://localhost:3000/dashboard`.
