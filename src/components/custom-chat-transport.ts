import { type UIMessage } from "@ai-sdk/react";
import {
  convertToModelMessages,
  streamText,
  type ChatRequestOptions,
  type ChatTransport,
  type LanguageModel,
  type UIMessageChunk,
} from "ai";

export class CustomChatTransport implements ChatTransport<UIMessage> {
  private model: LanguageModel;

  constructor(model: LanguageModel) {
    this.model = model;
  }

  updateModel(model: LanguageModel) {
    this.model = model;
  }

  async sendMessages(
    options: {
      chatId: string;
      messages: UIMessage[];
      abortSignal: AbortSignal | undefined;
    } & {
      trigger: "submit-message" | "regenerate-message";
      messageId: string | undefined;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk>> {
    // Check if this is an Ollama model (should go directly to backend)
    if (this.isOllamaModel()) {
      return this.sendOllamaMessages(options);
    }

    const result = streamText({
      model: this.model,
      messages: convertToModelMessages(options.messages),
      
      abortSignal: options.abortSignal,
      toolChoice: "auto",
      providerOptions: {
          openai: {
            reasoningSummary: 'detailed', // 'auto' for condensed or 'detailed' for comprehensive
          },
          google: {
            thinkingConfig: {
              includeThoughts: true,
            },
          },
      },
    });

    console.log("result from ai sdk", result)

    // Only enable reasoning for models that support it (like OpenAI's o1 models)
    const supportsReasoning = this.modelSupportsReasoning();
    
    return result.toUIMessageStream({
      sendReasoning: true,
      onError: (error) => {
        // Note: By default, the AI SDK will return "An error occurred",
        // which is intentionally vague in case the error contains sensitive information like API keys.
        // If you want to provide more detailed error messages, keep the code below. Otherwise, remove this onError callback.
        if (error == null) {
          return "Unknown error";
        }
        if (typeof error === "string") {
          return error;
        }
        if (error instanceof Error) {
          return error.message;
        }
        return JSON.stringify(error);
      },
    });
  }

  private isOllamaModel(): boolean {
    // Check if the model ID indicates it's an Ollama model
    const modelId = (this.model as any)?.modelId || this.model.toString();
    return modelId.includes(":") || modelId.startsWith("llama") || modelId.startsWith("qwen") || modelId.startsWith("codellama");
  }



  private modelSupportsReasoning(): boolean {
    // Ollama models don't support reasoning
    if (this.isOllamaModel()) {
      return false;
    }
    
    // Only certain models support reasoning (like OpenAI's o1 models)
    const modelId = (this.model as any)?.modelId || this.model.toString();
    return modelId.startsWith("o1-") || modelId.includes("reasoning");
  }

  private async sendOllamaMessages(
    options: {
      chatId: string;
      messages: UIMessage[];
      abortSignal: AbortSignal | undefined;
    } & {
      trigger: "submit-message" | "regenerate-message";
      messageId: string | undefined;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const { invoke } = await import("@tauri-apps/api/core");

    // Convert UI messages to the format expected by backend
    const backendMessages = options.messages.map(msg => ({
      role: msg.role,
      content: msg.parts?.map(part => {
        if (part.type === 'text') return part.text;
        if (part.type === 'reasoning') return part.text; // Include reasoning content
        return '';
      }).join('') || (msg as any).content || '',
    }));

    const modelId = (this.model as any)?.modelId || this.model.toString();

    try {
      const tokens: string[] = await invoke("stream_ollama_chat", {
        model: modelId,
        messages: backendMessages,
      });

      // Convert tokens to UIMessageChunk stream
      return new ReadableStream({
        start(controller) {
          let index = 0;
          const sendNext = () => {
            if (index < tokens.length) {
              controller.enqueue({
                type: "text-delta" as const,
                delta: tokens[index],
                id: options.messageId || "ollama-message",
              });
              index++;
              // Small delay to simulate streaming
              setTimeout(sendNext, 10);
            } else {
              controller.close();
            }
          };
          sendNext();
        },
      });
    } catch (error) {
      // Return error as a stream
      return new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "error" as const,
            errorText: error instanceof Error ? error.message : "Ollama error",
          });
          controller.close();
        },
      });
    }
  }

  async reconnectToStream(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: {
      chatId: string;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    // This function normally handles reconnecting to a stream on the backend, e.g. /api/chat
    // Since this project has no backend, we can't reconnect to a stream, so this is intentionally no-op.
    return null;
  }
}