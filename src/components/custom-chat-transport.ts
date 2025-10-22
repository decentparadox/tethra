import type { UIMessage } from "@ai-sdk/react";
import {
  convertToModelMessages,
  streamText,
  type ChatRequestOptions,
  type ChatTransport,
  type LanguageModel,
  type UIMessageChunk,
} from "ai";
import { toast } from "sonner";

export class CustomChatTransport implements ChatTransport<UIMessage> {
  private model: LanguageModel;
  private adapterKind?: string;

  constructor(model: LanguageModel, adapterKind?: string) {
    this.model = model;
    this.adapterKind = adapterKind;
  }

  updateModel(model: LanguageModel, adapterKind?: string) {
    this.model = model;
    this.adapterKind = adapterKind;
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
    if (await this.isOllamaModel()) {
      return this.sendOllamaMessages(options);
    }

    // Get reasoning preference from request body
    const useReasoning = (options.body as any)?.reasoning ?? false;

    const result = streamText({
      model: this.model,
      messages: convertToModelMessages(options.messages),
      onError({ error }) {
        console.error(error);
        toast.error("An error occurred", {
          description: error instanceof Error ? error.message : String(error),
        });
      },
      onFinish({ text, finishReason, usage, totalUsage, warnings }) {
        // Log completion details
        console.log("Response complete:", {
          finishReason,
          textLength: text?.length,
          totalTokens: totalUsage?.totalTokens,
        });

        // Show warnings as toasts
        if (warnings && warnings.length > 0) {
          for (const warning of warnings) {
            const warningMessage = 
              warning.type === "unsupported-setting"
                ? `Unsupported setting: ${warning.setting}${warning.details ? ` - ${warning.details}` : ""}`
                : typeof warning === "string"
                ? warning
                : JSON.stringify(warning);
            
            toast.warning("AI SDK Warning", {
              description: warningMessage,
              duration: 5000,
            });
          }
        }

        // Dispatch event to save the message with complete text
        setTimeout(() => {
          const event = new CustomEvent("ai-response-finished", {
            detail: {
              finishReason,
              usage,
              totalUsage,
              chatId: options.chatId,
              text, // Include the complete text
              timestamp: Date.now(),
            },
          });
          window.dispatchEvent(event);
        }, 100);
      },
      abortSignal: options.abortSignal,
      toolChoice: "auto",
      providerOptions: {
        openai: useReasoning ? {
          reasoningSummary: "detailed", // Enable detailed reasoning if requested
        } : {},
        google: useReasoning ? {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 8192,
          },
        } : {},
      },
    });

    console.log("result from ai sdk", result);
    console.log("Cached tokens:", result.providerMetadata);

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

  private async isOllamaModel(): Promise<boolean> {
    // Use adapter_kind if available for reliable provider detection
    if (this.adapterKind) {
      const { getProviderKeyFromDisplayName } = await import("@/components/providers");
      const providerKey = getProviderKeyFromDisplayName(this.adapterKind);
      return providerKey === "ollama";
    }
    
    // Fallback: Check model ID if adapter_kind is not available
    const modelId = (this.model as any)?.modelId || this.model.toString();
    
    // Ollama models don't have "/" in their ID, while provider models do (e.g., "openai/gpt-4")
    const hasProviderPrefix = modelId.includes("/");
    if (hasProviderPrefix) {
      return false; // This is a provider model (OpenRouter, etc.), not Ollama
    }
    
    // Only check for colon after confirming no provider prefix
    return (
      modelId.includes(":") ||
      modelId.startsWith("llama") ||
      modelId.startsWith("qwen") ||
      modelId.startsWith("codellama")
    );
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
    const backendMessages = options.messages.map((msg) => ({
      role: msg.role,
      content:
        msg.parts
          ?.map((part) => {
            if (part.type === "text") return part.text;
            if (part.type === "reasoning") return part.text; // Include reasoning content
            return "";
          })
          .join("") ||
        (msg as any).content ||
        "",
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
