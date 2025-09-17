"use client";

import { useEffect, useRef, useState } from "react";
import {
  createConversation,
  listChatModels,
  getMessages,
  saveCompleteMessage,
  getConversation,
  type ListedModel,
} from "../../lib/chat";
import { generateTitle, detectContextChange } from "../../lib/generate-title";
import { Send, Mic as MicIcon,Globe as GlobeIcon, Camera, MapPin } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSkeleton } from "@/components/ui/message-skeleton";
import { Virtualizer, type VirtualizerHandle } from "virtua";
import { StickToBottom, useStickToBottom } from "use-stick-to-bottom";

import { useChat as useCustomChat } from "@/hooks/use-chat";
import { AIMessage } from "@/components/ai-message";
import { UserMessage } from "@/components/user-message";
import { generateUUID } from "@/lib/utils";

import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';

export default function ChatView({
  conversationId,
}: {
  conversationId?: string;
}) {
  const [convId, setConvId] = useState<string | undefined>(conversationId);

  // Update convId when conversationId prop changes
  useEffect(() => {
    setConvId(conversationId);
  }, [conversationId]);
  const [input, setInput] = useState("");
  const [models, setModels] = useState<ListedModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(
    undefined
  );
  const [dbMessages, setDbMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [speeds] = useState<Record<string, number>>({});
  const lastConversationIdRef = useRef<string | undefined>(conversationId);
    const [useMicrophone, setUseMicrophone] = useState<boolean>(false);
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const mounted = useRef(false);
  const ref = useRef<VirtualizerHandle>(null);
  const instance = useStickToBottom({
    initial: "instant",
    resize: "instant",
  });
  const savedMessageIdsRef = useRef<Set<string>>(new Set());
  const titleGeneratedRef = useRef<boolean>(false);
  const messagesSinceLastTitleUpdateRef = useRef<number>(0);
  const lastTitleUpdateRef = useRef<number>(Date.now());

  // AI SDK integration - using dynamically selected model
  const currentModel = selectedModel || "gemini-2.0-flash";

  // Initialize appropriate provider and create model instance
  const [model, setModel] = useState<any>(null);

  useEffect(() => {
    const initializeModel = async () => {
      try {
        const { getProviderFromModel } = await import("@/components/providers");

        // Check if this is an Ollama model
        const isOllamaModel = currentModel.includes(":") ||
                             currentModel.startsWith("llama") ||
                             currentModel.startsWith("qwen") ||
                             currentModel.startsWith("codellama");

        if (isOllamaModel) {
          // For Ollama models, create a simple model object that will be detected by CustomChatTransport
          setModel({ modelId: currentModel, isOllama: true });
          return;
        }

        // For other models, use the appropriate AI SDK provider
        const providerName = getProviderFromModel(currentModel);
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
  }, [currentModel]);
  
  // Use AI SDK only for sending new messages, not for managing message history
  const { messages: newMessages, sendMessage, status } = useCustomChat(model, {
    id: convId,
    experimental_throttle: 100,
    generateId: generateUUID,
  });


  // Function to load messages directly from database
  const loadMessagesFromDb = async () => {
    if (!convId) {
      setDbMessages([]);
      return;
    }

    try {
      setIsLoadingMessages(true);
      const existingMessages = await getMessages(convId);
      setDbMessages(existingMessages);
      setIsLoadingMessages(false);
    } catch (error) {
      console.error("Failed to load messages from database:", error);
      setIsLoadingMessages(false);
    }
  };

  // Save new messages as they complete
  useEffect(() => {
    const saveNewMessages = async () => {
      if (!convId || newMessages.length === 0) {
        return;
      }
      
      let savedAny = false;
      let isFirstUserMessage = false;
      
      for (const message of newMessages) {
        // User messages are immediately complete, assistant messages need state: "done"
        const isUserMessage = message.role === "user";
        const isDone = message.parts?.some((part: any) => part.state === "done");
        const isComplete = isUserMessage || isDone;
        
        if (!savedMessageIdsRef.current.has(message.id) && isComplete) {
          try {
            await saveCompleteMessage(convId, message);
            savedMessageIdsRef.current.add(message.id);
            savedAny = true;
            
            // Check if this is the first user message for title generation
            if (isUserMessage && !titleGeneratedRef.current && dbMessages.length === 0) {
              isFirstUserMessage = true;
            }
          } catch (error) {
            console.error("Failed to save message:", message.id, error);
          }
        }
      }
      
      // After saving, reload from database if we saved anything
      if (savedAny) {
        await loadMessagesFromDb();
        
        // Generate title after first user message is saved
        if (isFirstUserMessage && model && !titleGeneratedRef.current) {
          titleGeneratedRef.current = true;
          try {
            const firstUserMessage = newMessages.find(m => m.role === "user");
            if (firstUserMessage) {
              await generateTitle({
                chatId: convId,
                firstMessage: firstUserMessage,
                model: model
              });
            }
          } catch (error) {
            console.error("Failed to generate title:", error);
          }
        }
        
      }
    };
    
    saveNewMessages();
  }, [newMessages, convId, model, dbMessages.length]);

  // Combined messages: database messages + only unsaved streaming messages
  const dbMessageIds = new Set(dbMessages.map(msg => msg.id));
  const unseenNewMessages = newMessages.filter(msg => !dbMessageIds.has(msg.id));
  const allMessages = [...dbMessages, ...unseenNewMessages];
  
  // Context change detection - runs after messages are updated
  useEffect(() => {
    const checkContextChange = async () => {
      if (!convId || !titleGeneratedRef.current || !model || allMessages.length < 6) {
        return;
      }

      // Increment message counter when new messages are added
      if (allMessages.length > 0) {
        messagesSinceLastTitleUpdateRef.current += 1;
      }
      
      // Check for context changes every 4-6 messages, with a minimum time interval
      const timeSinceLastUpdate = Date.now() - lastTitleUpdateRef.current;
      const shouldCheckContext = messagesSinceLastTitleUpdateRef.current >= 4 && 
                               timeSinceLastUpdate > 60000; // At least 1 minute between updates
      
      if (shouldCheckContext) {
        try {
          const conversation = await getConversation(convId);
          const currentTitle = conversation.title;
          
          const contextChangeResult = await detectContextChange({
            chatId: convId,
            recentMessages: allMessages,
            model: model,
            currentTitle: currentTitle,
            messagesSinceLastUpdate: messagesSinceLastTitleUpdateRef.current
          });
          
          if (contextChangeResult.hasChanged) {
            console.log(`Title updated from "${currentTitle}" to "${contextChangeResult.newTitle}"`);
            messagesSinceLastTitleUpdateRef.current = 0;
            lastTitleUpdateRef.current = Date.now();
          }
        } catch (error) {
          console.error("Failed to check for context changes:", error);
        }
      }
    };

    checkContextChange();
  }, [convId, model, allMessages.length]);

  useEffect(() => {
    if (mounted.current) {
      return;
    }
    
    ref.current?.scrollToIndex(allMessages.length - 1, {
      align: "end",
    });

    const timer = setTimeout(() => {
      mounted.current = true;
    }, 100);

    return () => clearTimeout(timer);
  }, [allMessages.length]);

  useEffect(() => {
    // Load messages when conversation ID changes
    lastConversationIdRef.current = convId;
    
    // Clear saved message IDs when switching conversations
    savedMessageIdsRef.current.clear();
    titleGeneratedRef.current = false;
    messagesSinceLastTitleUpdateRef.current = 0;
    lastTitleUpdateRef.current = Date.now();
    
    loadMessagesFromDb();
  }, [convId]);

  useEffect(() => {
    (async () => {
      try {
        const list = await listChatModels();
        setModels(list);
        
        if (list.length > 0) {
          // All models are now enabled by default if API key is set
          const defaultModel = list[0].model;
          
          // Try to load from localStorage first, fallback to default
          const storedModel = localStorage.getItem("selected-model");
          const modelToUse = storedModel && list.find(m => m.model === storedModel) ? storedModel : defaultModel;
          
          setSelectedModel((m) => m ?? modelToUse);
        }
      } catch (error) {
        console.error("Failed to load models in chat view:", error);
      }
    })();

    const handler = (e: any) => {
      const selected = e?.detail as string | undefined;
      if (selected) {
        setSelectedModel(selected);
        localStorage.setItem("selected-model", selected);
      }
    };
    window.addEventListener("model-selected", handler as EventListener);
    return () =>
      window.removeEventListener("model-selected", handler as EventListener);
  }, []);

  // Auto-scroll for new messages
  useEffect(() => {
    if (status === "streaming") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [status, allMessages.length]);

  const onSend = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }


    // All models are now enabled by default if API key is set
    // No need to check for enabled models anymore

    if (selectedModel) {
    }

    setInput("");
    let current = convId;

    // Create conversation if it doesn't exist
    if (!current) {
      const conv = await createConversation();
      current = conv.id;
      setConvId(current);
      history.replaceState(null, "", `/dashboard/${conv.id}`);
    }

    // Send message using AI SDK - this will trigger the chat flow and message saving
    sendMessage(
      { 
        text: message.text || 'Sent with attachments',
        files: message.files 
      },
      {
        body: {
          model: model,
          webSearch: useWebSearch,
        },
      },
    );
  };

  const hasAnyMessages = allMessages.length > 0;

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
              {console.log(allMessages)}
              {allMessages.map((message) => (
                
                <div key={message.id} className="mb-4">
                  {message.role === "assistant" ? (

                    <AIMessage 
                      message={message}
                      status={status}
                      onCopy={() => {
                        const text = message.parts
                          ?.filter((part: any) => part.type === 'text')
                          .map((part: any) => part.text)
                          .join('') || '';
                        navigator.clipboard.writeText(text);
                      }}
                      onRegenerate={() => {
                        // For now, just trigger a new message
                      }}
                      tokensPerSecond={speeds[message.id]}
                    />
                  ) : (
                    <UserMessage message={message} />
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
        {/* {!isLoadingMessages && (
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
                  disabled={status === "streaming"}
                />
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-white hover:bg-black/10"
                >
                  <Mic size={16} />
                </button>
                <button
                  type="submit"
                  disabled={status === "streaming"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-white hover:bg-black/10 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        )} */}
        <PromptInput onSubmit={onSend} className="mt-4" globalDrop multiple>
          <PromptInputBody>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
          </PromptInputBody>
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputButton
                onClick={() => setUseMicrophone(!useMicrophone)}
                variant={useMicrophone ? 'default' : 'ghost'}
              >
                <MicIcon size={16} />
                <span className="sr-only">Microphone</span>
              </PromptInputButton>
              <PromptInputButton
                onClick={() => setUseWebSearch(!useWebSearch)}
                variant={useWebSearch ? 'default' : 'ghost'}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
             
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </Virtualizer>
    </StickToBottom>
  );
}

