import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { interviewSession } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
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

    const userId = session.user.id;
    const body = await request.json();
    const { callId } = body;

    if (!callId) {
      return NextResponse.json(
        { error: "callId is required" },
        { status: 400 }
      );
    }

    // Find the session
    const [existingSession] = await db
      .select()
      .from(interviewSession)
      .where(
        and(
          eq(interviewSession.callId, callId),
          eq(interviewSession.userId, userId)
        )
      );

    if (!existingSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Calculate duration
    const endedAt = new Date();
    const durationMs = endedAt.getTime() - existingSession.startedAt.getTime();

    // Update the session
    const [updatedSession] = await db
      .update(interviewSession)
      .set({
        status: "completed",
        endedAt,
        durationMs,
      })
      .where(eq(interviewSession.callId, callId))
      .returning();

    // Note: Summary generation is triggered by the transcript endpoint
    // when the Python agent sends transcripts after the call ends

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error ending meeting:", error);
    return NextResponse.json(
      { error: "Failed to end meeting" },
      { status: 500 }
    );
  }
}
