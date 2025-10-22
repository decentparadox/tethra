import { useState, useEffect } from "react";

export function useModelManager(currentModel: string, adapterKind?: string) {
  // AI SDK integration - using dynamically selected model
  const [model, setModel] = useState<any>(null);

  useEffect(() => {
    const initializeModel = async () => {
      try {
        const { getProviderFromModel } = await import("@/components/providers");

        // Check if this is an Ollama model
        // const isOllamaModel =
        // 	currentModel.includes(":") ||
        // 	currentModel.startsWith("llama") ||
        // 	currentModel.startsWith("qwen") ||
        // 	currentModel.startsWith("codellama");

        // if (isOllamaModel) {
        // 	// For Ollama models, create a simple model object that will be detected by CustomChatTransport
        // 	setModel({ modelId: currentModel, isOllama: true });
        // 	return;
        // }

        // For other models, use the appropriate AI SDK provider
        // Pass adapter_kind for more accurate provider detection
        const providerName = getProviderFromModel(currentModel, adapterKind);
        const { PROVIDERS } = await import("@/components/providers");

        const provider = PROVIDERS[providerName];
        if (provider) {
          await provider.initialize();
          const modelInstance = provider.getInstance(currentModel);
          setModel(modelInstance);
        } else {
          console.error("No provider found for model:", currentModel);
        }
      } catch (error) {
        console.error("Failed to initialize model:", error);
      }
    };

    initializeModel();
  }, [currentModel, adapterKind]);

  return { model };
}
