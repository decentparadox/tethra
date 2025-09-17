import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getApiKey } from "../../lib/api-keys";

let googleInstance: ReturnType<typeof createGoogleGenerativeAI> | null = null;

export const google = (model: string) => {
  if (!googleInstance) {
    throw new Error("Google provider not initialized. Call initializeGoogle() first.");
  }
  return googleInstance(model);
};

export async function initializeGoogle(): Promise<void> {
  const apiKey = await getApiKey("google");
  console.log(apiKey)
  if (!apiKey) {
    // For testing purposes, use a fallback or show a message
    console.warn("Google API key not found. Using fallback or demo mode.");
    // You can either throw an error or use a demo key here
    // For now, let's throw to make it clear when configuration is needed
    throw new Error("Google API key not found. Please configure it in settings.");
  }
  
  googleInstance = createGoogleGenerativeAI({
    apiKey,
  });
}