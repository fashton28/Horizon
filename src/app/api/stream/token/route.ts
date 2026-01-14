import { NextRequest, NextResponse } from "next/server";
import { generateUserToken } from "@/lib/stream";
import { auth } from "@/lib/auth";

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
    const token = generateUserToken(userId);

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating Stream token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
