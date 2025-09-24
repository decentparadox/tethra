import { createOpenAI } from "@ai-sdk/openai";
import { getApiKey } from "../../lib/api-keys";

let groqInstance: ReturnType<typeof createOpenAI> | null = null;

export const groq = (model: string) => {
	if (!groqInstance) {
		throw new Error(
			"Groq provider not initialized. Call initializeGroq() first.",
		);
	}
	return groqInstance(model);
};

export async function initializeGroq(): Promise<void> {
	const apiKey = await getApiKey("groq");
	if (!apiKey) {
		throw new Error("Groq API key not found. Please configure it in settings.");
	}

	groqInstance = createOpenAI({
		apiKey,
		baseURL: "https://api.groq.com/openai/v1",
	});
}

export async function fetchGroqModels(): Promise<string[]> {
	const apiKey = await getApiKey("groq");
	if (!apiKey) {
		throw new Error("Groq API key not found");
	}

	try {
		const response = await fetch("https://api.groq.com/openai/v1/models", {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch Groq models: ${response.statusText}`);
		}

		const data = await response.json();
		const chatModels = data.data.map((model: any) => model.id).sort();

		return chatModels;
	} catch (error) {
		console.error("Failed to fetch Groq models:", error);
		// Return fallback models
		return [
			"llama-3.2-90b-text-preview",
			"llama-3.2-11b-text-preview",
			"llama-3.2-3b-preview",
			"llama-3.2-1b-preview",
			"llama-3.1-70b-versatile",
			"llama-3.1-8b-instant",
			"mixtral-8x7b-32768",
		];
	}
}
