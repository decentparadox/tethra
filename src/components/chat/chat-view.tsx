"use client";

import { useEffect, useRef, useState } from "react";
import {
  addMessage,
  createConversation,
  getMessages,
  streamChat,
  listChatModels,
  type Message,
  type ListedModel,
} from "../../lib/chat";
import { chatCache } from "../../lib/chat-cache";
import { listen } from "@tauri-apps/api/event";
import { Send, Copy, RefreshCw, Mic, Camera, MapPin } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Response } from "@/components/response";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { MessageSkeleton } from "@/components/ui/message-skeleton";
import { Virtualizer, type VirtualizerHandle } from "virtua";
import { StickToBottom, useStickToBottom } from "use-stick-to-bottom";

type SpeedMap = Record<string, number>;

// Streaming message interface
interface StreamingMessage extends Message {
  isStreaming?: boolean;
  streamingContent?: string;
}

export default function ChatView({
  conversationId,
}: {
  conversationId?: string;
}) {
  const [convId, setConvId] = useState<string | undefined>(conversationId);
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [input, setInput] = useState("");
  const [models, setModels] = useState<ListedModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(
    undefined
  );
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const streamStartAtRef = useRef<number | null>(null);
  const [speeds, setSpeeds] = useState<SpeedMap>({});
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<
    string | null
  >(null);
  const lastConversationIdRef = useRef<string | undefined>(conversationId);
  const mounted = useRef(false);
  const ref = useRef<VirtualizerHandle>(null);
  const instance = useStickToBottom({
    initial: "instant",
    resize: "instant",
  });

  useEffect(() => {
    if (mounted.current) {
      return;
    }

    ref.current?.scrollToIndex(messages.map((m) => m.id).length - 1, {
      align: "end",
    });

    const timer = setTimeout(() => {
      mounted.current = true;
    }, 100);

    return () => clearTimeout(timer);
  }, [messages.map((m) => m.id).length]);

  useEffect(() => {
    const load = async () => {
      if (!convId) {
        setMessages([]);
        lastConversationIdRef.current = undefined;
        return;
      }

      // Update last conversation ref
      lastConversationIdRef.current = convId;

      // Try to get from cache first
      const cachedMessages = chatCache.getMessages(convId);
      if (cachedMessages) {
        setMessages(cachedMessages);

        // Start preloading adjacent conversations
        setTimeout(() => {
          const adjacent = chatCache.getAdjacentConversationIds(convId);
          const toPreload = [adjacent.prev, adjacent.next].filter(
            Boolean
          ) as string[];
          if (toPreload.length > 0) {
            chatCache.preloadConversations(toPreload, getMessages, 1);
          }
        }, 200);

        return;
      }

      // If not in cache, show loading and fetch from server
      setIsLoadingMessages(true);
      try {
        const msgs = await getMessages(convId);
        // Deduplicate messages by ID
        const uniqueMessages = msgs.filter(
          (msg, index, arr) => arr.findIndex((m) => m.id === msg.id) === index
        );

        // Cache the messages and update state
        chatCache.setMessages(convId, uniqueMessages);
        setMessages(uniqueMessages);
        console.log(uniqueMessages);

        // Start preloading adjacent conversations
        setTimeout(() => {
          const adjacent = chatCache.getAdjacentConversationIds(convId);
          const toPreload = [adjacent.prev, adjacent.next].filter(
            Boolean
          ) as string[];
          if (toPreload.length > 0) {
            chatCache.preloadConversations(toPreload, getMessages, 1);
          }
        }, 500);
      } catch (error) {
        console.error("Failed to load messages:", error);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    void load();
  }, [convId]);

  useEffect(() => {
    (async () => {
      try {
        const list = await listChatModels();
        setModels(list);
        
        if (list.length > 0) {
          const enabledModels = list.filter((m) => m.enabled);
          const defaultModel =
            enabledModels.length > 0 ? enabledModels[0].model : list[0].model;
          setSelectedModel((m) => m ?? defaultModel);
        }
      } catch {}
    })();

    const handler = (e: any) => {
      const selected = e?.detail as string | undefined;
      if (selected) {
        setSelectedModel(selected);
        // Store in localStorage for consistency
        localStorage.setItem("selected-model", selected);
      }
    };
    window.addEventListener("model-selected", handler as EventListener);
    return () =>
      window.removeEventListener("model-selected", handler as EventListener);
  }, []);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    (async () => {
      // Listen for stream start
      const streamStartUnsub = await listen<{
        conversation_id: string;
        message_id: string;
      }>("chat_stream_start", (e) => {
        if (e.payload.conversation_id === convId) {
          const streamingMessage: StreamingMessage = {
            id: e.payload.message_id,
            conversation_id: e.payload.conversation_id,
            role: "assistant",
            content: "",
            created_at: new Date().toISOString(),
            isStreaming: true,
            streamingContent: "",
          };

          setMessages((prev) => {
            // Check if message with this ID gbalready exists
            const existingIndex = prev.findIndex(
              (msg) => msg.id === streamingMessage.id
            );
            if (existingIndex !== -1) {
              // Update existing message instead of adding duplicate
              const updated = [...prev];
              updated[existingIndex] = streamingMessage;
              return updated;
            }
            return [...prev, streamingMessage];
          });
          setCurrentStreamingMessageId(e.payload.message_id);
          streamStartAtRef.current = Date.now();
        }
      });
      unsubs.push(() => streamStartUnsub());

      // Listen for stream tokens
      const streamTokenUnsub = await listen<{
        conversation_id: string;
        token: string;
      }>("chat_stream_token", (e) => {
        if (e.payload.conversation_id === convId) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (
                msg.isStreaming &&
                msg.conversation_id === e.payload.conversation_id
              ) {
                return {
                  ...msg,
                  streamingContent:
                    (msg.streamingContent || "") + e.payload.token,
                };
              }
              return msg;
            })
          );
        }
      });
      unsubs.push(() => streamTokenUnsub());

      // Listen for stream end
      const streamEndUnsub = await listen<{
        conversation_id: string;
        message_id: string;
        complete_content: string;
      }>("chat_stream_end", (e) => {
        if (e.payload.conversation_id === convId) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === e.payload.message_id && msg.isStreaming) {
                return {
                  ...msg,
                  content: e.payload.complete_content,
                  isStreaming: false,
                  streamingContent: undefined,
                };
              }
              return msg;
            })
          );

          // Calculate tokens per second
          const startedAt = streamStartAtRef.current;
          if (startedAt) {
            const durationSec = Math.max(0.25, (Date.now() - startedAt) / 1000);
            const approxTokens = Math.max(
              1,
              Math.ceil(e.payload.complete_content.length / 4)
            );
            const tps = approxTokens / durationSec;
            setSpeeds((s) => ({ ...s, [e.payload.message_id]: tps }));
          }

          setCurrentStreamingMessageId(null);
          streamStartAtRef.current = null;
        }
      });
      unsubs.push(() => streamEndUnsub());
    })();

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [convId]);


  // Always scroll for streaming content
  useEffect(() => {
    if (currentStreamingMessageId) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentStreamingMessageId]);

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;

    // Check if any models are enabled (have API keys)
    const enabledModels = models.filter(m => m.enabled);
    if (enabledModels.length === 0) {
      // Show a temporary message in the chat instead of an alert
      const noApiKeyMessage: StreamingMessage = {
        id: `system-${Date.now()}`,
        conversation_id: conversationId || 'temp',
        role: "assistant",
        content: `I'd love to help, but you'll need to set up an API key first! 

To get started:
1. Go to Settings → Model Providers
2. Choose a provider (OpenAI, Anthropic, Google Gemini, Groq, or OpenRouter)
3. Add your API key
4. Come back and let's chat!

We support multiple providers so you can choose the one that works best for you.`,
        created_at: new Date().toISOString(),
        isStreaming: false
      };
      
      setMessages((m) => [...m, noApiKeyMessage]);
      return;
    }

    if (selectedModel) {
      const found = models.find((m) => m.model === selectedModel);
      if (found && !found.enabled) {
        // Show a temporary message for specific model without API key
        const modelNoApiKeyMessage: StreamingMessage = {
          id: `system-${Date.now()}`,
          conversation_id: conversationId || 'temp',
          role: "assistant",
          content: `The ${selectedModel} model requires an API key for ${found.adapter_kind}. 

Please go to Settings → Model Providers and set up your ${found.adapter_kind} API key to use this model.`,
          created_at: new Date().toISOString(),
          isStreaming: false
        };
        
        setMessages((m) => [...m, modelNoApiKeyMessage]);
        return;
      }
    }

    setInput("");
    let current = convId;
    if (!current) {
      const conv = await createConversation();
      current = conv.id;
      setConvId(current);
      history.replaceState(null, "", `/dashboard/${conv.id}`);
    }

    // Optimistic update: add message immediately to UI
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: current,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((m) => [...m, optimisticMessage]);
    chatCache.addMessage(current, optimisticMessage);

    // Then save to server and update with real ID
    try {
      const user = await addMessage(current, "user", text);
      setMessages((m) => {
        const updated = m.map((msg) =>
          msg.id === optimisticMessage.id ? user : msg
        );
        return updated;
      });
      chatCache.setMessages(
        current,
        messages.map((msg) => (msg.id === optimisticMessage.id ? user : msg))
      );
    } catch (error) {
      // Remove optimistic message on error
      setMessages((m) => m.filter((msg) => msg.id !== optimisticMessage.id));
      console.error("Failed to save message:", error);
      return;
    }

    console.log("Sending message with selected model:", selectedModel);
    void streamChat(current, text, selectedModel);
  };

  const hasAnyMessages = messages.length > 0;

  return (
    <StickToBottom className="" instance={instance}>
    <Virtualizer
      as={StickToBottom.Content}
      ref={ref}
      scrollRef={instance.scrollRef}
      ssrCount={5}
      overscan={1}
    >
      <div
        className={`flex flex-col h-[calc(100dvh-44px)] p-4 ${
          hasAnyMessages || isLoadingMessages
            ? "bg-transparent"
            : "bg-gradient-to-b from-transparent via-transparent  to-[#E6181B]/80"
        }`}
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <MessageSkeleton />
          </div>
        ) : (
          <ScrollArea className="h-full w-full rounded-md p-4 flex-1 overflow-y-auto space-y-2 no-scrollbar">
            <div className="h-full w-full overflow-y-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={m.role === "user" ? "text-right" : "text-left"}
                >
                  {m.role === "assistant" && (
                    <div className="mb-1 flex flex-col items-start gap-2 text-white/80">
                      <div className="flex items-center gap-2">
                        <img src="/logo.svg" alt="Tethra" className="h-5 w-5" />
                        <span className=" font-medium">Tethra</span>
                      </div>
                      {m.isStreaming && (
                        <TextShimmer
                          className="text-sm"
                          duration={1}
                          spread={1}
                        >
                          Tethra is thinking
                        </TextShimmer>
                      )}
                    </div>
                  )}
                  {m.role === "assistant" ? (
                    <div className="max-w-2xl text-white">
                      <Response>
                        {m.isStreaming ? m.streamingContent || "" : m.content}
                      </Response>
                      {!m.isStreaming && (
                        <div className="mt-3 flex items-center gap-3 text-xs text-white/60">
                          <button
                            className="hover:text-white/90"
                            onClick={() =>
                              navigator.clipboard.writeText(m.content)
                            }
                            title="Copy"
                          >
                            <span className="inline-flex items-center gap-1">
                              <Copy size={14} /> Copy
                            </span>
                          </button>
                          <button
                            className="hover:text-white/90"
                            onClick={() => {
                              const lastUser = [...messages]
                                .reverse()
                                .find((x) => x.role === "user");
                              if (!lastUser || !convId) return;
                              console.log(
                                "Regenerating with selected model:",
                                selectedModel
                              );
                              void streamChat(
                                convId,
                                lastUser.content,
                                selectedModel
                              );
                            }}
                            title="Regenerate"
                          >
                            <span className="inline-flex items-center gap-2">
                              <RefreshCw size={14} />
                              Regenerate
                              {speeds[m.id] && (
                                <span className="ml-1 opacity-80">
                                  • {Math.round(speeds[m.id])} tokens/sec
                                </span>
                              )}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="inline-block max-w-2xl rounded-xl px-4 py-3 text-white bg-white/10">
                      <p className="whitespace-pre-wrap leading-7 no-scrollbar">
                        {m.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        )}

        {!hasAnyMessages && !isLoadingMessages && (
          <>
            <div className="mb-3 flex items-center gap-2 text-white">
              <img src="/logo.svg" alt="Lumen" width={24} height={24} />
              <span className="text-2xl font-mondwest">Tethra</span>
            </div>
            <div className="mb-3 flex gap-3 text-white">
              <div className="flex-1 rounded-2xl bg-white/10 p-4 ">
                <p className="text-sm leading-snug">
                  Suggest beautiful
                  <br />
                  places to see on an
                  <br />
                  upcoming road trip
                </p>
                <div className="mt-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                    <Camera size={18} />
                  </div>
                </div>
              </div>
              <div className="w-40 rounded-2xl bg-white/10 p-4 ">
                <p className="text-sm leading-snug">
                  Nearest
                  <br />
                  Petrol Pump
                </p>
                <div className="mt-6">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                    <MapPin size={18} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {!isLoadingMessages && (
          <div className="flex items-center gap-2 w-full">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void onSend();
              }}
              className="rounded-2xl bg-white/10 text-white p-2 pl-4 shadow-sm w-full"
            >
              <div className="w-full flex items-center gap-2">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void onSend();
                    }
                  }}
                  placeholder="Respond to Tethra"
                  className="w-full flex-1 bg-transparent text-white placeholder-white outline-none resize-none overflow-y-auto max-h-52 leading-normal"
                  disabled={currentStreamingMessageId !== null}
                />
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-white hover:bg-black/10"
                >
                  <Mic size={16} />
                </button>
                <button
                  type="submit"
                  disabled={currentStreamingMessageId !== null}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-white hover:bg-black/10 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Virtualizer>
    </StickToBottom>
  );
}
