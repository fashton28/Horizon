import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interviewSession, sessionTranscript } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callId, transcripts } = body as {
      callId: string;
      transcripts: TranscriptEntry[];
    };

    if (!callId || !transcripts || !Array.isArray(transcripts)) {
      return NextResponse.json(
        { error: "Missing callId or transcripts" },
        { status: 400 }
      );
    }

    // Find the session by callId
    const [session] = await db
      .select()
      .from(interviewSession)
      .where(eq(interviewSession.callId, callId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Insert transcript entries
    for (let i = 0; i < transcripts.length; i++) {
      const entry = transcripts[i];
      await db.insert(sessionTranscript).values({
        id: nanoid(),
        sessionId: session.id,
        speaker: entry.speaker,
        text: entry.text,
        sequenceNumber: i,
      });
    }

    // Build and store concatenated full transcript
    const fullTranscript = transcripts
      .map((t) => `${t.speaker.toUpperCase()}: ${t.text}`)
      .join("\n\n");

    await db
      .update(interviewSession)
      .set({ fullTranscript })
      .where(eq(interviewSession.id, session.id));

    // Trigger summary generation now that we have transcripts
    if (transcripts.length > 0) {
      const baseUrl = process.env.NEXTAUTH_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

      console.log(`Triggering summary generation for session ${session.id}`);

      fetch(`${baseUrl}/api/session/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      }).catch((err) => {
        console.error("Failed to trigger summary generation:", err);
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      entriesStored: transcripts.length,
    });
  } catch (error) {
    console.error("Error storing transcript:", error);
    return NextResponse.json(
      { error: "Failed to store transcript" },
      { status: 500 }
    );
  }
}
