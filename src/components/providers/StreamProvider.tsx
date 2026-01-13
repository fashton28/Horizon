"use client";

import {
  StreamVideo,
  StreamVideoClient,
  User,
} from "@stream-io/video-react-sdk";
import { useEffect, useState } from "react";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

interface StreamProviderProps {
  children: React.ReactNode;
}

export function StreamProvider({ children }: StreamProviderProps) {
  const [client, setClient] = useState<StreamVideoClient | null>(null);

  useEffect(() => {
    // Generate a random user ID for now (will be replaced with auth later)
    const userId = `user-${Math.random().toString(36).substring(2, 9)}`;

    const initClient = async () => {
      try {
        // Fetch token from our API
        const response = await fetch("/api/stream/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          throw new Error("Failed to get Stream token");
        }

        const { token } = await response.json();

        const user: User = {
          id: userId,
          name: `Guest ${userId.slice(-4)}`,
          type: "guest",
        };

        const videoClient = new StreamVideoClient({
          apiKey,
          user,
          token,
        });

        setClient(videoClient);
      } catch (error) {
        console.error("Failed to initialize Stream client:", error);
      }
    };

    initClient();

    return () => {
      if (client) {
        client.disconnectUser();
      }
    };
  }, []);

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <StreamVideo client={client}>{children}</StreamVideo>;
}
