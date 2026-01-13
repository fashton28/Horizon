"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  User,
} from "@stream-io/video-react-sdk";
import { MeetingSetup } from "@/components/meeting/MeetingSetup";
import { MeetingRoom } from "@/components/meeting/MeetingRoom";
import { Loader2 } from "lucide-react";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

interface MeetingPageProps {
  params: Promise<{ id: string }>;
}

export default function MeetingPage({ params }: MeetingPageProps) {
  const resolvedParams = use(params);
  const callId = resolvedParams.id;
  const searchParams = useSearchParams();
  const interviewType = searchParams.get("type") || "general";
  const userId = searchParams.get("userId") || `user-${Math.random().toString(36).substring(2, 9)}`;

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<ReturnType<StreamVideoClient["call"]> | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initClient = async () => {
      try {
        // Get token from our API
        const tokenResponse = await fetch("/api/stream/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!tokenResponse.ok) {
          throw new Error("Failed to get token");
        }

        const { token } = await tokenResponse.json();

        const user: User = {
          id: userId,
          name: `Candidate ${userId.slice(-4)}`,
          type: "guest",
        };

        const videoClient = new StreamVideoClient({
          apiKey,
          user,
          token,
        });

        const videoCall = videoClient.call("default", callId);

        setClient(videoClient);
        setCall(videoCall);
      } catch (err) {
        console.error("Failed to initialize meeting:", err);
        setError("Failed to initialize meeting. Please try again.");
      }
    };

    initClient();

    return () => {
      if (call) {
        call.leave();
      }
      if (client) {
        client.disconnectUser();
      }
    };
  }, [callId, userId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <a href="/dashboard" className="text-primary underline">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!client || !call) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Setting up your interview...</p>
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        {!isSetupComplete ? (
          <MeetingSetup
            onJoin={() => setIsSetupComplete(true)}
            interviewType={interviewType}
          />
        ) : (
          <MeetingRoom interviewType={interviewType} />
        )}
      </StreamCall>
    </StreamVideo>
  );
}
