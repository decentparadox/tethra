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

export async function fetchGoogleModels(): Promise<string[]> {
  const apiKey = await getApiKey("google");
  if (!apiKey) {
    throw new Error("Google API key not found");
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google models: ${response.statusText}`);
    }

    const data = await response.json();
    // Filter to only generative models and extract model names
    const chatModels = data.models
      .filter((model: any) => 
        model.supportedGenerationMethods?.includes('generateContent') &&
        (model.name.includes('gemini') || model.name.includes('chat'))
      )
      .map((model: any) => model.name.replace('models/', ''))
      .sort();

    return chatModels;
  } catch (error) {
    console.error("Failed to fetch Google models:", error);
    // Return fallback models
    return [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash",
      "gemini-1.5-pro", 
      "gemini-1.0-pro",
    ];
  }
}