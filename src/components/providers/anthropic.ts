import { createAnthropic } from "@ai-sdk/anthropic";
import { getProviderConfig } from "../../lib/api-keys";

let anthropicInstance: ReturnType<typeof createAnthropic> | null = null;

export const anthropic = (model: string) => {
  if (!anthropicInstance) {
    throw new Error("Anthropic provider not initialized. Call initializeAnthropic() first.");
  }
  return anthropicInstance(model);
};

export async function initializeAnthropic(): Promise<void> {
  const config = await getProviderConfig("anthropic");
  if (!config?.api_key) {
    throw new Error("Anthropic API key not found. Please configure it in settings.");
  }
  
  anthropicInstance = createAnthropic({
    apiKey: config.api_key,
    baseURL: config.base_url,
  });
}
