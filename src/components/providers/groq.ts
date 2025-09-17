import { createOpenAI } from "@ai-sdk/openai";
import { getApiKey } from "../../lib/api-keys";

let groqInstance: ReturnType<typeof createOpenAI> | null = null;

export const groq = (model: string) => {
  if (!groqInstance) {
    throw new Error("Groq provider not initialized. Call initializeGroq() first.");
  }
  return groqInstance(model);
};

export async function initializeGroq(): Promise<void> {
  const apiKey = await getApiKey("groq");
  if (!apiKey) {
    throw new Error("Groq API key not found. Please configure it in settings.");
  }
  
  groqInstance = createOpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
}
