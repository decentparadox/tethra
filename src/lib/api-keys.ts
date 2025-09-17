import { invoke } from "@tauri-apps/api/core";

interface CachedApiKey {
  key: string;
  timestamp: number;
}

interface ProviderConfig {
  api_key?: string;
  base_url?: string;
}

// Cache API keys for 5 minutes to avoid frequent backend calls
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const apiKeyCache = new Map<string, CachedApiKey>();

export async function getApiKey(provider: string): Promise<string | null> {
  // Check cache first
  const cached = apiKeyCache.get(provider);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.key;
  }

  try {
    // Fetch from backend
    const apiKey = await invoke<string | null>("get_api_key", { provider });
    
    if (apiKey) {
      // Cache the key
      apiKeyCache.set(provider, {
        key: apiKey,
        timestamp: Date.now(),
      });
      return apiKey;
    }
    return null;
  } catch (error) {
    console.error(`Failed to get API key for ${provider}:`, error);
    return null;
  }
}

export async function setApiKey(provider: string, apiKey: string): Promise<void> {
  try {
    await invoke("set_api_key", { provider, api_key: apiKey });
    
    // Update cache
    apiKeyCache.set(provider, {
      key: apiKey,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(`Failed to set API key for ${provider}:`, error);
    throw error;
  }
}

export async function getProviderConfig(provider: string): Promise<ProviderConfig | null> {
  // Check cache for API key first
  const cached = apiKeyCache.get(provider);
  let apiKey: string | undefined;
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    apiKey = cached.key;
  }

  try {
    const config = await invoke<ProviderConfig>("get_provider_config", { provider });
    
    // Cache the API key if we got one
    if (config.api_key && !apiKey) {
      apiKeyCache.set(provider, {
        key: config.api_key,
        timestamp: Date.now(),
      });
    }
    
    return config;
  } catch (error) {
    console.error(`Failed to get provider config for ${provider}:`, error);
    return null;
  }
}

export function clearApiKeyCache(provider?: string): void {
  if (provider) {
    apiKeyCache.delete(provider);
  } else {
    apiKeyCache.clear();
  }
}

export function getCachedProviders(): string[] {
  return Array.from(apiKeyCache.keys());
}
