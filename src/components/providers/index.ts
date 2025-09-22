import { initializeGoogle, fetchGoogleModels } from "./google";
import { initializeOpenAI, fetchOpenAIModels } from "./openai";
import { initializeAnthropic, fetchAnthropicModels } from "./anthropic";
import { initializeGroq, fetchGroqModels } from "./groq";
import { initializeOpenRouter, fetchOpenRouterModels } from "./openrouter";
import { initializeOllama, fetchOllamaModels } from "./ollama";
import { initializeDeepseek, fetchDeepSeekModels } from "./deepseek";
import { google } from "./google";
import { openai } from "./openai";
import { anthropic } from "./anthropic";
import { groq } from "./groq";
import { openrouter } from "./openrouter";
import { ollama } from "./ollama";
import { deepseek } from "./deepseek";

export interface ModelProvider {
  name: string;
  displayName: string;
  models: string[];
  initialize: () => Promise<void>;
  getInstance: (model: string) => any;
  fetchModels?: () => Promise<string[]>;
}

export const PROVIDERS: Record<string, ModelProvider> = {
  google: {
    name: "google",
    displayName: "Google Gemini",
    models: [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-1.0-pro",
    ],
    initialize: initializeGoogle,
    getInstance: google,
    fetchModels: fetchGoogleModels,
  },
  ollama: {
    name: "ollama",
    displayName: "Ollama",
    models: [
      "llama3.2:3b",
      "llama3.1:8b",
      "llama3.1:70b",
      "qwen2.5:7b",
      "codellama:7b",
    ],
    initialize: initializeOllama,
    getInstance: ollama,
    fetchModels: fetchOllamaModels,
  },
  openai: {
    name: "openai",
    displayName: "OpenAI",
    models: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
    ],
    initialize: initializeOpenAI,
    getInstance: openai,
    fetchModels: fetchOpenAIModels,
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic Claude",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ],
    initialize: initializeAnthropic,
    getInstance: anthropic,
    fetchModels: fetchAnthropicModels,
  },
  groq: {
    name: "groq",
    displayName: "Groq",
    models: [
      "llama-3.2-90b-text-preview",
      "llama-3.2-11b-text-preview",
      "llama-3.2-3b-preview",
      "llama-3.2-1b-preview",
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
    ],
    initialize: initializeGroq,
    getInstance: groq,
    fetchModels: fetchGroqModels,
  },
  openrouter: {
    name: "openrouter",
    displayName: "OpenRouter",
    models: [
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
    ],
    initialize: initializeOpenRouter,
    getInstance: openrouter,
    fetchModels: fetchOpenRouterModels,
  },
  deepseek: {
    name: "deepseek",
    displayName: "DeepSeek",
    models: [
      "deepseek-chat",
      "deepseek-coder",
      "deepseek-reasoner",
      "deepseek-chat-67b",
      "deepseek-coder-33b"
    ],
    initialize: initializeDeepseek,
    getInstance: deepseek,
    fetchModels: fetchDeepSeekModels,
  },
};

export function getProviderFromModel(model: string): string {
  // Check if model has provider prefix (for openrouter)
  if (model.includes("/")) {
    return "openrouter";
  }

  // Detect Ollama models by format (name:tag) or common Ollama model names
  // These should be handled by the backend directly, not through AI SDK
  if (model.includes(":") || model.startsWith("llama") || model.startsWith("qwen") || model.startsWith("codellama")) {
    return "ollama";
  }

  // Check each provider's models
  for (const [providerName, provider] of Object.entries(PROVIDERS)) {
    if (provider.models.includes(model)) {
      return providerName;
    }
  }

  // Default fallback based on model name patterns
  if (model.startsWith("gpt-")) return "openai";
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("gemini-")) return "google";
  if (model.startsWith("deepseek-") || model.startsWith("deepseek/")) return "deepseek";
  if (model.startsWith("llama-") || model.startsWith("mixtral-")) return "groq";

  return "openrouter"; // Default fallback to openrouter for unknown models
}

export async function initializeProvider(providerName: string): Promise<void> {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}`);
  }
  
  try {
    await provider.initialize();
    console.log(`${provider.displayName} provider initialized successfully`);
  } catch (error) {
    console.error(`Failed to initialize ${provider.displayName}:`, error);
    throw error;
  }
}

export async function getModelInstance(model: string) {
  const providerName = getProviderFromModel(model);
  const provider = PROVIDERS[providerName];
  
  if (!provider) {
    throw new Error(`No provider found for model: ${model}`);
  }
  
  try {
    // Initialize provider if not already done
    await provider.initialize();
    return provider.getInstance(model);
  } catch (error) {
    console.error(`Failed to get model instance for ${model}:`, error);
    throw error;
  }
}

export async function fetchProviderModels(providerName: string): Promise<string[]> {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  try {
    if (provider.fetchModels) {
      const dynamicModels = await provider.fetchModels();
      if (dynamicModels && dynamicModels.length > 0) {
        return dynamicModels;
      }
    }
    // Fallback to hardcoded models if dynamic fetch fails or is not available
    return provider.models;
  } catch (error) {
    console.warn(`Failed to fetch dynamic models for ${providerName}, using fallback:`, error);
    return provider.models;
  }
}

export async function getAllAvailableModels(): Promise<{ [providerName: string]: string[] }> {
  const allModels: { [providerName: string]: string[] } = {};
  
  const fetchPromises = Object.keys(PROVIDERS).map(async (providerName) => {
    try {
      const models = await fetchProviderModels(providerName);
      allModels[providerName] = models;
    } catch (error) {
      console.warn(`Failed to fetch models for ${providerName}:`, error);
      allModels[providerName] = PROVIDERS[providerName].models;
    }
  });

  await Promise.all(fetchPromises);
  return allModels;
}
