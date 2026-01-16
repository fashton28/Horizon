"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  Clock,
  Calendar,
  Mic,
  Code,
  Users,
  Brain,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Target,
  RefreshCw,
} from "lucide-react";

const interviewTypes: Record<string, { name: string; icon: React.ComponentType<{ className?: string }> }> = {
  technical: { name: "Technical", icon: Code },
  behavioral: { name: "Behavioral", icon: Users },
  system_design: { name: "System Design", icon: Brain },
  product: { name: "Product", icon: Briefcase },
  general: { name: "General", icon: Mic },
};

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  sequenceNumber: number;
}

interface SessionSummary {
  overallSummary: string;
  strengths: string[];
  areasForImprovement: string[];
  actionableNextSteps: string[];
  overallScore: number;
}

interface SessionData {
  session: {
    id: string;
    callId: string;
    name: string | null;
    interviewType: string;
    language: string;
    voice: string;
    status: string;
    summaryStatus: string | null;
    startedAt: string;
    endedAt: string | null;
    durationMs: number | null;
  };
  transcripts: TranscriptEntry[];
  summary: SessionSummary | null;
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { data: authSession } = authClient.useSession();

  const { data, isLoading, error, refetch } = useQuery<SessionData>({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/session/${sessionId}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error("Session not found");
        if (response.status === 403) throw new Error("Access denied");
        throw new Error("Failed to fetch session");
      }
      return response.json();
    },
    enabled: !!authSession?.user && !!sessionId,
    refetchInterval: (query) => {
      // Auto-refresh if summary is still processing
      const data = query.state.data as SessionData | undefined;
      if (data?.session?.summaryStatus === "processing") {
        return 5000;
      }
      return false;
    },
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes < 1) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-orange-100";
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { session, transcripts, summary } = data;
  const typeInfo = interviewTypes[session.interviewType] || interviewTypes.general;
  const TypeIcon = typeInfo.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TypeIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">
                  {session.name || <span className="capitalize">{session.interviewType.replace("_", " ")} Interview</span>}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {session.name && <span className="capitalize">{session.interviewType.replace("_", " ")} · </span>}
                  {formatDate(session.startedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Session Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{formatDuration(session.durationMs)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <Mic className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Voice</p>
                <p className="font-medium">{session.voice}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Language</p>
                <p className="font-medium capitalize">{session.language}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  session.status === "completed" ? "bg-green-500" : "bg-yellow-500"
                }`}
              />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{session.status.replace("_", " ")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transcript */}
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              {transcripts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No transcript available</p>
                  <p className="text-sm">Transcript will appear after your next session</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {transcripts.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex ${entry.speaker === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          entry.speaker === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-xs font-medium mb-1 opacity-70 capitalize">
                          {entry.speaker === "user" ? "You" : "AI Interviewer"}
                        </p>
                        <p className="text-sm">{entry.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="space-y-6">
            {session.summaryStatus === "processing" ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="font-medium">Generating Summary...</p>
                  <p className="text-sm text-muted-foreground">
                    AI is analyzing your interview performance
                  </p>
                </CardContent>
              </Card>
            ) : session.summaryStatus === "failed" ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
                  <p className="font-medium">Summary Generation Failed</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    There was an error analyzing your interview
                  </p>
                  <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : summary ? (
              <>
                {/* Score */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Overall Score</h3>
                      <div
                        className={`px-3 py-1 rounded-full font-bold ${getScoreBg(summary.overallScore)} ${getScoreColor(summary.overallScore)}`}
                      >
                        {summary.overallScore}/100
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          summary.overallScore >= 80
                            ? "bg-green-500"
                            : summary.overallScore >= 60
                            ? "bg-yellow-500"
                            : "bg-orange-500"
                        }`}
                        style={{ width: `${summary.overallScore}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {summary.overallSummary}
                    </p>
                  </CardContent>
                </Card>

                {/* Strengths */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summary.strengths.map((strength, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                          <span className="text-sm">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Areas for Improvement */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      Areas for Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summary.areasForImprovement.map((area, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                          <span className="text-sm">{area}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Action Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summary.actionableNextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="h-5 w-5 rounded bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-sm">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-8 w-8 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No Summary Available</p>
                  <p className="text-sm text-muted-foreground">
                    Complete an interview session to receive AI feedback
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
