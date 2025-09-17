// Ollama models are handled directly by the backend
// No frontend provider needed since requests go directly to Tauri backend

export const ollama = () => {
  throw new Error("Ollama models should be handled by the backend, not through AI SDK providers");
};

export async function initializeOllama(): Promise<void> {
  // Ollama doesn't need API keys - it runs locally
  // No initialization needed
}
