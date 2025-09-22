import { createOpenAI } from "@ai-sdk/openai";
import { getApiKey } from "../../lib/api-keys";

let deepseekInstance: ReturnType<typeof createOpenAI> | null = null;

export const deepseek = (model: string) => {
  if (!deepseekInstance) {
    throw new Error("Deepseek provider not initialized. Call initializeDeepseek() first.");
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
  });
}

export async function fetchDeepSeekModels(): Promise<string[]> {
  const apiKey = await getApiKey("deepseek");
  if (!apiKey) {
    throw new Error("DeepSeek API key not found");
  }

  try {
    const response = await fetch("https://api.deepseek.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch DeepSeek models: ${response.statusText}`);
    }

    const data = await response.json();
    const chatModels = data.data
      .map((model: any) => model.id)
      .sort();

    return chatModels;
  } catch (error) {
    console.error("Failed to fetch DeepSeek models:", error);
    // Return fallback models
    return [
      "deepseek-chat",
      "deepseek-coder",
      "deepseek-reasoner",
      "deepseek-chat-67b",
      "deepseek-coder-33b"
    ];
  }
}
