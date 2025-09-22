import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getApiKey } from "../../lib/api-keys";

let openrouterInstance: ReturnType<typeof createOpenRouter> | null = null;

export const openrouter = (model: string) => {
  if (!openrouterInstance) {
    throw new Error("OpenRouter provider not initialized. Call initializeOpenRouter() first.");
  }
  return openrouterInstance.chat(model);
};

export async function initializeOpenRouter(): Promise<void> {
  const apiKey = await getApiKey("openrouter");
  if (!apiKey) {
    throw new Error("OpenRouter API key not found. Please configure it in settings.");
  }

  openrouterInstance = createOpenRouter({
    apiKey,
  });
}

export async function fetchOpenRouterModels(): Promise<string[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenRouter models: ${response.statusText}`);
    }

    const data = await response.json();
    const chatModels = data.data
      .filter((model: any) => !model.id.includes("moderation"))
      .map((model: any) => model.id)
      .sort();

    return chatModels;
  } catch (error) {
    console.error("Failed to fetch OpenRouter models:", error);
    // Return fallback models
    return [
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3-haiku",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "google/gemini-pro-1.5",
      "google/gemini-flash-1.5",
      "meta-llama/llama-3.2-90b-instruct",
      "meta-llama/llama-3.1-405b-instruct",
      "mistralai/mistral-large",
      "mistralai/mistral-7b-instruct",
      "mistralai/mistral-small-3.2-24b-instruct",
    ];
  }
}