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

export async function fetchOpenAIModels(): Promise<string[]> {
  const config = await getProviderConfig("openai");
  if (!config?.api_key) {
    throw new Error("OpenAI API key not found");
  }

  try {
    const baseURL = config.base_url || "https://api.openai.com/v1";
    const response = await fetch(`${baseURL}/models`, {
      headers: {
        "Authorization": `Bearer ${config.api_key}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAI models: ${response.statusText}`);
    }

    const data = await response.json();
    // Filter to only chat models and sort by name
    const chatModels = data.data
      .filter((model: any) => 
        model.id.includes("gpt") || 
        model.id.includes("chat") ||
        model.id.includes("turbo")
      )
      .map((model: any) => model.id)
      .sort();

    return chatModels;
  } catch (error) {
    console.error("Failed to fetch OpenAI models:", error);
    // Return fallback models
    return [
      "gpt-4o",
      "gpt-4o-mini", 
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
    ];
  }
}