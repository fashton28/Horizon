import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interviewSession, sessionSummary } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { generateSummaryWithGemini } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    // Get the session with transcript
    const [session] = await db
      .select()
      .from(interviewSession)
      .where(eq(interviewSession.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (!session.fullTranscript) {
      return NextResponse.json(
        { error: "No transcript available for this session" },
        { status: 400 }
      );
    }

    // Update status to processing
    await db
      .update(interviewSession)
      .set({ summaryStatus: "processing" })
      .where(eq(interviewSession.id, sessionId));

    try {
      // Generate summary using Gemini
      const summary = await generateSummaryWithGemini(
        session.fullTranscript,
        session.interviewType
      );

      // Store the summary
      await db.insert(sessionSummary).values({
        id: nanoid(),
        sessionId,
        overallSummary: summary.overallSummary,
        strengths: JSON.stringify(summary.strengths),
        areasForImprovement: JSON.stringify(summary.areasForImprovement),
        actionableNextSteps: JSON.stringify(summary.actionableNextSteps),
        overallScore: summary.overallScore,
      });

      // Update session status to completed
      await db
        .update(interviewSession)
        .set({ summaryStatus: "completed" })
        .where(eq(interviewSession.id, sessionId));

      return NextResponse.json({
        success: true,
        summary,
      });
    } catch (genError) {
      console.error("Error generating summary:", genError);

      // Update status to failed
      await db
        .update(interviewSession)
        .set({ summaryStatus: "failed" })
        .where(eq(interviewSession.id, sessionId));

      return NextResponse.json(
        { error: "Failed to generate summary" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in summary endpoint:", error);
    return NextResponse.json(
      { error: "Failed to process summary request" },
      { status: 500 }
    );
  }
}
