import { useState, useEffect, useRef } from "react";
import { useChat as useCustomChat } from "@/hooks/use-chat";
import { createConversation, listChatModels, type ListedModel } from "@/lib/chat";
import { generateUUID } from "@/lib/utils";
import { useModelManager } from "./use-model-manager";
import { useMessageManager } from "./use-message-manager";
import { useTitleGenerator } from "./use-title-generator";
import { type PromptInputMessage } from '@/components/ai-elements/prompt-input';

export function useChatLogic(conversationId?: string) {
  const [convId, setConvId] = useState<string | undefined>(conversationId);
  const [input, setInput] = useState("");
  const [models, setModels] = useState<ListedModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const [useMicrophone, setUseMicrophone] = useState<boolean>(false);
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const mounted = useRef(false);
  const ref = useRef<any>(null);

  // Update convId when conversationId prop changes
  useEffect(() => {
    setConvId(conversationId);
  }, [conversationId]);

  // AI SDK integration - using dynamically selected model
  const currentModel = selectedModel || "gemini-2.0-flash";
  const { model } = useModelManager(currentModel);

  // Use AI SDK only for sending new messages, not for managing message history
  const { messages: newMessages, sendMessage, status } = useCustomChat(model, {
    id: convId,
    experimental_throttle: 100,
    generateId: generateUUID,
  });

  const {
    allMessages,
    isLoadingMessages,
    titleGeneratedRef,
    messagesSinceLastTitleUpdateRef,
    lastTitleUpdateRef
  } = useMessageManager(convId, newMessages, model);

  const { generateInitialTitle } = useTitleGenerator({
    convId,
    model,
    allMessages,
    titleGeneratedRef,
    messagesSinceLastTitleUpdateRef,
    lastTitleUpdateRef
  });

  // Generate title after first user message is saved
  useEffect(() => {
    if (newMessages.length > 0 && !titleGeneratedRef.current) {
      const firstUserMessage = newMessages.find(m => m.role === "user");
      if (firstUserMessage) {
        generateInitialTitle(firstUserMessage);
      }
    }
  }, [newMessages, generateInitialTitle, titleGeneratedRef.current]);

  // Handle virtualizer mounting and scrolling
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

  // Load models and handle model selection
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

          setSelectedModel((m: string | undefined) => m ?? modelToUse);
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

  const onSend = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
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

  const onCopy = (message: any) => {
    const text = message.parts
      ?.filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('') || '';
    navigator.clipboard.writeText(text);
  };

  const onRegenerate = () => {
    // For now, just trigger a new message
  };

  const hasAnyMessages = allMessages.length > 0;

  return {
    convId,
    input,
    setInput,
    models,
    selectedModel,
    setSelectedModel,
    useMicrophone,
    setUseMicrophone,
    useWebSearch,
    setUseWebSearch,
    allMessages,
    isLoadingMessages,
    status,
    onSend,
    onCopy,
    onRegenerate,
    hasAnyMessages,
    mounted,
    ref,
    model
  };
}
