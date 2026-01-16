import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { useResume, UseResumeError, ApiCreateResume } from "@useresume/sdk";

const USERESUME_API_KEY = process.env.USERESUME_API_KEY;

// Helper to convert null values to undefined for type compatibility
function nullToUndefined<T>(obj: T): T {
  if (obj === null) return undefined as unknown as T;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(nullToUndefined) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = nullToUndefined(value);
  }
  return result as T;
}

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

    if (!USERESUME_API_KEY) {
      console.error("USERESUME_API_KEY environment variable not set");
      return NextResponse.json(
        { error: "Resume service not configured" },
        { status: 500 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    // Initialize UseResume client
    const client = new useResume(USERESUME_API_KEY);

    // Convert file to base64
    const fileBuffer = await file.arrayBuffer();
    const base64File = Buffer.from(fileBuffer).toString("base64");

    // Step 1: Parse the uploaded resume to extract structured data
    console.log("Parsing uploaded resume...");
    const parseResult = await client.parseResume({
      file: base64File,
      parse_to: "json",
    });

    if (!parseResult.success || !parseResult.data) {
      console.error("Failed to parse resume:", parseResult);
      return NextResponse.json(
        { error: "Failed to parse resume. Please ensure the PDF is readable." },
        { status: 400 }
      );
    }

    console.log("Resume parsed successfully, creating optimized version...");

    // Convert parsed data (with nulls) to format expected by createResume (with undefined)
    const resumeContent = nullToUndefined(parseResult.data) as ApiCreateResume["content"];

    // Step 2: Create a new resume with the "horizon" template and amber color
    const createResult = await client.createResume({
      content: resumeContent,
      style: {
        template: "horizon",
        template_color: "amber",
        font: "inter",
      },
    });

    if (!createResult.success || !createResult.data?.file_url) {
      console.error("Failed to create resume:", createResult);
      return NextResponse.json(
        { error: "Failed to generate optimized resume" },
        { status: 500 }
      );
    }

    console.log("Resume created successfully:", createResult.data.file_url);

    // Return the download URL
    return NextResponse.json({
      success: true,
      download_url: createResult.data.file_url,
      expires_at: createResult.data.file_url_expires_at,
      credits_used: createResult.meta?.credits_used,
      credits_remaining: createResult.meta?.credits_remaining,
    });

  } catch (error) {
    console.error("Error optimizing resume:", error);

    if (error instanceof UseResumeError) {
      return NextResponse.json(
        { error: `Resume API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to optimize resume. Please try again." },
      { status: 500 }
    );
  }
}
