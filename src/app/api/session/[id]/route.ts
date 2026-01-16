import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interviewSession, sessionTranscript, sessionSummary } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the interview session
    const [interviewSessionData] = await db
      .select()
      .from(interviewSession)
      .where(eq(interviewSession.id, id))
      .limit(1);

    if (!interviewSessionData) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify the session belongs to the authenticated user
    if (interviewSessionData.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get transcripts ordered by sequence
    const transcripts = await db
      .select()
      .from(sessionTranscript)
      .where(eq(sessionTranscript.sessionId, id))
      .orderBy(asc(sessionTranscript.sequenceNumber));

    // Get summary if exists
    const [summary] = await db
      .select()
      .from(sessionSummary)
      .where(eq(sessionSummary.sessionId, id))
      .limit(1);

    // Parse JSON fields in summary
    const parsedSummary = summary
      ? {
          ...summary,
          strengths: JSON.parse(summary.strengths),
          areasForImprovement: JSON.parse(summary.areasForImprovement),
          actionableNextSteps: JSON.parse(summary.actionableNextSteps),
        }
      : null;

    return NextResponse.json({
      session: interviewSessionData,
      transcripts,
      summary: parsedSummary,
    });
  } catch (error) {
    console.error("Error fetching session details:", error);
    return NextResponse.json(
      { error: "Failed to fetch session details" },
      { status: 500 }
    );
  }
}
