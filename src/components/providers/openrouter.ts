import { createOpenAI } from "@ai-sdk/openai";
import { getApiKey } from "../../lib/api-keys";

let openrouterInstance: ReturnType<typeof createOpenAI> | null = null;

export const openrouter = (model: string) => {
  if (!openrouterInstance) {
    throw new Error("OpenRouter provider not initialized. Call initializeOpenRouter() first.");
  }
  return openrouterInstance(model);
};

export async function initializeOpenRouter(): Promise<void> {
  const apiKey = await getApiKey("openrouter");
  if (!apiKey) {
    throw new Error("OpenRouter API key not found. Please configure it in settings.");
  }
  
  openrouterInstance = createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
}
