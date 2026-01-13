import { StreamClient } from "@stream-io/node-sdk";

const apiKey = process.env.STREAM_API_KEY!;
const apiSecret = process.env.STREAM_API_SECRET!;

let streamClient: StreamClient | null = null;

export function getStreamClient(): StreamClient {
  if (!streamClient) {
    streamClient = new StreamClient(apiKey, apiSecret);
  }
  return streamClient;
}

export function generateUserToken(userId: string): string {
  const client = getStreamClient();
  // Token expires in 1 hour
  const expirationTime = Math.floor(Date.now() / 1000) + 60 * 60;
  return client.generateUserToken({ user_id: userId, exp: expirationTime });
}

export async function createCall(callId: string, callType: string = "default") {
  const client = getStreamClient();
  const call = client.video.call(callType, callId);

  await call.getOrCreate({
    data: {
      created_by_id: "system",
    },
  });

  return call;
}
