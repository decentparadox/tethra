import { Copy, RefreshCw } from "lucide-react";
import { Response } from "./response";
import { TextShimmer } from "./ui/text-shimmer";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "./ai-elements/reasoning";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from "@/components/ai-elements/context";
import type { LanguageModelUsage } from "ai";

interface AIMessageProps {
  message: any; // Use any for now to work with AI SDK types
  status?: "submitted" | "streaming" | "ready" | "error";
  onCopy?: () => void;
  onRegenerate?: () => void;
  tokensPerSecond?: number;
  modelId?: string;
}

export function AIMessage({
  message,
  status = "ready",
  onCopy,
  onRegenerate,
  tokensPerSecond,
  modelId,
}: AIMessageProps) {
  // Extract usage data from message metadata
  const usage: LanguageModelUsage | undefined = message.metadata?.usage;
  const totalTokens = usage?.totalTokens ?? 0;
  // Set a reasonable max token limit based on common models (can be customized per model)
  const maxTokens = 128000; // Default for most modern models

  return (
    <div className="text-left">
      <div className="mb-1 flex flex-col items-start gap-2 text-white/80">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Tethra" className="h-5 w-5" />
          <span className="font-medium">Tethra</span>
        </div>
        {status === "submitted" && (
          <TextShimmer className="text-sm" duration={1} spread={1}>
            Tethra is thinking
          </TextShimmer>
        )}
      </div>
      <div className="w-full text-white">
        {/* Handle AI SDK message content structure */}
        <Message from={message.role} key={message.id}>
          <MessageContent variant="flat">
            {message.parts
              ?.filter((part: any) => {
                // Filter out unknown part types like step-start, step-end, step-finish, etc.
                // These are internal AI SDK types that shouldn't be rendered
                const knownTypes = ["text", "reasoning"];
                const ignoredTypes = ["step-start", "step-end", "step-finish", "step"];
                
                return !ignoredTypes.includes(part.type) && knownTypes.includes(part.type);
              })
              .map((part: any, index: number) => {
                switch (part.type) {
                  case "text":
                    // Only render text parts that have content or are still streaming
                    if (!part.text && status !== "streaming") {
                      return null;
                    }
                    return (
                      <Response key={`${message.id}-text-${index}`}>
                        {part.text || ""}
                      </Response>
                    );
                  case "reasoning":
                    return (
                      <Reasoning
                        key={`${message.id}-reasoning-${index}`}
                        isStreaming={status === "streaming"}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  default:
                    return null;
                }
              })}
          </MessageContent>
        </Message>
        {status === "ready" && (
          <div className="mt-3 flex items-center gap-3 text-xs text-white/60">
            <button
              className="hover:text-white/90"
              onClick={onCopy}
              title="Copy"
            >
              <span className="inline-flex items-center gap-1">
                <Copy size={14} /> Copy
              </span>
            </button>
            <button
              className="hover:text-white/90"
              onClick={onRegenerate}
              title="Regenerate"
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={14} />
                Regenerate
                {tokensPerSecond && (
                  <span className="ml-1 opacity-80">
                    • {Math.round(tokensPerSecond)} tokens/sec
                  </span>
                )}
              </span>
            </button>
            {usage && totalTokens > 0 && (
              <Context
                maxTokens={maxTokens}
                modelId={modelId as any}
                usage={usage}
                usedTokens={totalTokens}
              >
                <ContextTrigger />
                <ContextContent>
                  <ContextContentHeader />
                  <ContextContentBody>
                    <ContextInputUsage />
                    <ContextOutputUsage />
                    <ContextReasoningUsage />
                    <ContextCacheUsage />
                  </ContextContentBody>
                  <ContextContentFooter />
                </ContextContent>
              </Context>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
