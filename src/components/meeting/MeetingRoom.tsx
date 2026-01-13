"use client";

import {
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface MeetingRoomProps {
  interviewType: string;
}

export function MeetingRoom({ interviewType }: MeetingRoomProps) {
  const router = useRouter();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      router.push("/dashboard");
    }
  }, [callingState, router]);

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Joining the interview...</p>
      </div>
    );
  }

  return (
    <StreamTheme>
      <div className="h-screen w-full flex flex-col">
        {/* Header */}
        <div className="bg-background border-b px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold">AI Interview Practice</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {interviewType.replace("_", " ")} Interview
            </p>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative">
          <SpeakerLayout participantsBarPosition="bottom" />
        </div>

        {/* Controls */}
        <div className="bg-background border-t p-4">
          <CallControls onLeave={() => router.push("/dashboard")} />
        </div>
      </div>
    </StreamTheme>
  );
}
