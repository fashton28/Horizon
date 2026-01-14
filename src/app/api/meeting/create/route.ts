import { NextRequest, NextResponse } from "next/server";
import { createCall, generateUserToken } from "@/lib/stream";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { interviewSession } from "@/db/schema";

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || "http://localhost:8001";

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
    const { interviewType = "general", language = "en", voice = "Puck" } = body;

    // Generate a unique call ID
    const callId = `interview-${nanoid(10)}`;

    // Create the call on Stream
    await createCall(callId);

    // Save session to database
    const sessionId = nanoid();
    await db.insert(interviewSession).values({
      id: sessionId,
      callId,
      userId,
      interviewType,
      language,
      voice,
      status: "in_progress",
      startedAt: new Date(),
    });

    // Generate a token for the user
    const token = generateUserToken(userId);

    // Trigger the AI agent to join the call
    try {
      await fetch(`${AGENT_SERVER_URL}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          call_id: callId,
          call_type: "default",
          interview_type: interviewType,
          language: language,
          voice: voice,
        }),
      });
      console.log(`Agent triggered for call: ${callId} (language: ${language}, voice: ${voice})`);
    } catch (agentError) {
      console.warn("Failed to trigger agent (is the agent server running?):", agentError);
      // Don't fail the request if agent isn't available - user can still join the call
    }

    return NextResponse.json({
      callId,
      token,
      interviewType,
      language,
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    );
  }
}
