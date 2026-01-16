import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export interface SessionSummaryData {
  overallSummary: string;
  strengths: string[];
  areasForImprovement: string[];
  actionableNextSteps: string[];
  overallScore: number;
}

const interviewTypeLabels: Record<string, string> = {
  technical: "Technical/Coding",
  behavioral: "Behavioral",
  system_design: "System Design",
  product: "Product/PM",
  general: "General",
};

export async function generateSummaryWithGemini(
  transcript: string,
  interviewType: string
): Promise<SessionSummaryData> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const typeLabel = interviewTypeLabels[interviewType] || interviewType;

  const prompt = `You are an expert interview coach analyzing a mock ${typeLabel} interview session.

TRANSCRIPT:
${transcript}

Analyze this interview and provide a detailed assessment. Be specific, constructive, and reference actual moments from the transcript when possible.

Respond with ONLY a valid JSON object in this exact format (no markdown, no code blocks, just the JSON):
{
  "overallSummary": "2-3 paragraph summary of the interview performance, highlighting key moments and overall impression",
  "strengths": ["specific strength 1 with example from interview", "specific strength 2 with example", "specific strength 3 with example"],
  "areasForImprovement": ["specific area 1 with suggestion", "specific area 2 with suggestion", "specific area 3 with suggestion"],
  "actionableNextSteps": ["Specific action 1 to improve", "Specific action 2 to improve", "Specific action 3 to improve"],
  "overallScore": 75
}

Guidelines:
- overallScore should be 1-100 based on interview performance
- Include 2-4 items in each array
- Be encouraging but honest
- Reference specific moments from the transcript
- For technical interviews, assess problem-solving approach
- For behavioral interviews, assess STAR method usage
- For system design, assess scalability thinking`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Parse JSON from response - handle potential markdown code blocks
  let jsonText = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1];
  }

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse summary response from Gemini");
  }

  const parsed = JSON.parse(jsonMatch[0]) as SessionSummaryData;

  // Validate and sanitize the response
  return {
    overallSummary: parsed.overallSummary || "Unable to generate summary.",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    areasForImprovement: Array.isArray(parsed.areasForImprovement)
      ? parsed.areasForImprovement
      : [],
    actionableNextSteps: Array.isArray(parsed.actionableNextSteps)
      ? parsed.actionableNextSteps
      : [],
    overallScore: Math.min(100, Math.max(1, parsed.overallScore || 50)),
  };
}
