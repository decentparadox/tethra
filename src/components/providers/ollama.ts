import { createOllama } from "ollama-ai-provider-v2";

let ollamaInstance: ReturnType<typeof createOllama> | null = null;

export const ollama = (model: string) => {
	if (!ollamaInstance) {
		throw new Error(
			"Ollama provider not initialized. Call initializeOllama() first.",
		);
	}
	return ollamaInstance(model);
};

export async function initializeOllama(): Promise<void> {
	// Ollama doesn't need API keys - it runs locally
	// Initialize with default localhost configuration
	ollamaInstance = createOllama({
		baseURL: "http://localhost:11434/api",
	});
}

export async function fetchOllamaModels(): Promise<string[]> {
	try {
		// Fetch available models from Ollama API
		const response = await fetch("http://localhost:11434/api/tags");

		if (!response.ok) {
			throw new Error(`Failed to fetch Ollama models: ${response.statusText}`);
		}

		const data = await response.json();
		// Extract model names from the response
		const modelNames = data.models?.map((model: any) => model.name) || [];

		if (modelNames.length > 0) {
			return modelNames.sort();
		}

		// Fallback to common models if no models are installed
		throw new Error("No models found");
	} catch (error) {
		console.warn("Failed to fetch Ollama models, using fallback:", error);
		// Return a basic set of common models as fallback
		return [
			"llama3.2:3b",
			"llama3.1:8b",
			"llama3.1:70b",
			"qwen2.5:7b",
			"codellama:7b",
		];
	}
}
