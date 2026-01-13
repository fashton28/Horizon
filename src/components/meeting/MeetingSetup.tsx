"use client";

import { useEffect, useState } from "react";
import {
  DeviceSettings,
  VideoPreview,
  useCall,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, Loader2 } from "lucide-react";

interface MeetingSetupProps {
  onJoin: () => void;
  interviewType: string;
}

export function MeetingSetup({ onJoin, interviewType }: MeetingSetupProps) {
  const call = useCall();
  const { useMicrophoneState, useCameraState } = useCallStateHooks();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const { camera, isMute: isCameraMuted } = useCameraState();
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    // Enable camera and mic by default for preview
    camera.enable();
    microphone.enable();
  }, [camera, microphone]);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await call?.join({ create: true });
      onJoin();
    } catch (error) {
      console.error("Failed to join call:", error);
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Ready to Practice?</CardTitle>
          <p className="text-muted-foreground capitalize">
            {interviewType.replace("_", " ")} Interview Session
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Preview */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            <VideoPreview />
            {isCameraMuted && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <VideoOff className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Device Controls */}
          <div className="flex justify-center gap-4">
            <Button
              variant={isMicMuted ? "destructive" : "secondary"}
              size="lg"
              onClick={() => microphone.toggle()}
              className="gap-2"
            >
              {isMicMuted ? (
                <>
                  <MicOff className="h-5 w-5" />
                  Mic Off
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" />
                  Mic On
                </>
              )}
            </Button>
            <Button
              variant={isCameraMuted ? "destructive" : "secondary"}
              size="lg"
              onClick={() => camera.toggle()}
              className="gap-2"
            >
              {isCameraMuted ? (
                <>
                  <VideoOff className="h-5 w-5" />
                  Camera Off
                </>
              ) : (
                <>
                  <Video className="h-5 w-5" />
                  Camera On
                </>
              )}
            </Button>
          </div>

          {/* Device Settings */}
          <div className="flex justify-center">
            <DeviceSettings />
          </div>

          {/* Join Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleJoin}
            disabled={isJoining}
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Interview"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Your AI interviewer is ready and waiting. Good luck!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
