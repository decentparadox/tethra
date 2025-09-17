import { createOpenAI } from "@ai-sdk/openai";
import { deepseek as DeepSeek } from "@ai-sdk/deepseek"
import { getApiKey } from "../../lib/api-keys";

let deepseekInstance: ReturnType<typeof createOpenAI> | null = null;

export const deepseek = (model: string) => {
  if (!deepseekInstance) {
    throw new Error("Deepseek provider not initialized. Call initializeOpenRouter() first.");
  }
  return deepseekInstance(model);
};

export async function initializeDeepseek(): Promise<void> {
  const apiKey = await getApiKey("deepseek");
  if (!apiKey) {
    throw new Error("Deepseek API key not found. Please configure it in settings.");
  }
  
  deepseekInstance = createOpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com/v1",
    headers: {
      'Access-Control-Allow-Origin': '*',
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    }
  });
}
