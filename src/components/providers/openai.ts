import { createOpenAI } from "@ai-sdk/openai";
import { getProviderConfig } from "../../lib/api-keys";

let openaiInstance: ReturnType<typeof createOpenAI> | null = null;

export const openai = (model: string) => {
  if (!openaiInstance) {
    throw new Error("OpenAI provider not initialized. Call initializeOpenAI() first.");
  }
  return openaiInstance(model);
};

export async function initializeOpenAI(): Promise<void> {
  const config = await getProviderConfig("openai");
  if (!config?.api_key) {
    throw new Error("OpenAI API key not found. Please configure it in settings.");
  }
  
  openaiInstance = createOpenAI({
    apiKey: config.api_key,
    baseURL: config.base_url,
  });
}
