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

export async function fetchAnthropicModels(): Promise<string[]> {
  // Anthropic doesn't have a public models API endpoint
  // Return the latest known models
  return [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022", 
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
  ];
}