import { useState, useEffect } from "react";
import { useChat as useCustomChat } from "@/hooks/use-chat";
import {
  createConversation,
  listChatModels,
  type ListedModel,
} from "@/lib/chat";
import { generateUUID } from "@/lib/utils";
import { useModelManager } from "./use-model-manager";
import { useMessageManager } from "./use-message-manager";
import { useTitleGenerator } from "./use-title-generator";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

export function useChatLogic(conversationId?: string) {
  const [convId, setConvId] = useState<string | undefined>(conversationId);
  const [input, setInput] = useState("");
  const [models, setModels] = useState<ListedModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(
    undefined,
  );
  const [selectedModelAdapter, setSelectedModelAdapter] = useState<string | undefined>(
    undefined,
  );
  const [useMicrophone, setUseMicrophone] = useState<boolean>(false);
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [useReasoning, setUseReasoning] = useState<boolean>(false);

  // Update convId when conversationId prop changes
  useEffect(() => {
    setConvId(conversationId);
  }, [conversationId]);

  // AI SDK integration - using dynamically selected model
  const currentModel = selectedModel as string;
  const { model } = useModelManager(currentModel, selectedModelAdapter);

  // Use AI SDK only for sending new messages, not for managing message history
  const {
    messages: newMessages,
    sendMessage,
    status,
  } = useCustomChat(model, selectedModelAdapter, {
    id: convId,
    experimental_throttle: 100,
    generateId: generateUUID,
  });

  const {
    allMessages,
    isLoadingMessages,
    titleGeneratedRef,
    messagesSinceLastTitleUpdateRef,
    lastTitleUpdateRef,
  } = useMessageManager(convId, newMessages, model);

  const { generateInitialTitle } = useTitleGenerator({
    convId,
    model,
    allMessages,
    titleGeneratedRef,
    messagesSinceLastTitleUpdateRef,
    lastTitleUpdateRef,
  });

  // Generate title after first user message is saved
  useEffect(() => {
    if (newMessages.length > 0 && !titleGeneratedRef.current) {
      const firstUserMessage = newMessages.find((m) => m.role === "user");
      if (firstUserMessage) {
        generateInitialTitle(firstUserMessage);
      }
    }
  }, [newMessages, generateInitialTitle, titleGeneratedRef.current]);

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
          const storedAdapter = localStorage.getItem("selected-model-adapter");
          const modelToUse =
            storedModel && list.find((m) => m.model === storedModel)
              ? storedModel
              : defaultModel;
          const adapterToUse = storedAdapter || list[0]?.adapter_kind;

          setSelectedModel((m: string | undefined) => m ?? modelToUse);
          setSelectedModelAdapter((a: string | undefined) => a ?? adapterToUse);
        }
      } catch (error) {
        console.error("Failed to load models in chat view:", error);
      }
    })();

    const handler = (e: any) => {
      const detail = e?.detail;
      // Support both old string format and new object format
      if (typeof detail === 'string') {
        setSelectedModel(detail);
        localStorage.setItem("selected-model", detail);
      } else if (detail && detail.model) {
        setSelectedModel(detail.model);
        localStorage.setItem("selected-model", detail.model);
        if (detail.adapterKind) {
          setSelectedModelAdapter(detail.adapterKind);
          localStorage.setItem("selected-model-adapter", detail.adapterKind);
        }
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
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      {
        body: {
          model: model,
          webSearch: useWebSearch,
          reasoning: useReasoning,
        },
      },
    );
  };

  const onCopy = (message: any) => {
    const text =
      message.parts
        ?.filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("") || "";
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
    useReasoning,
    setUseReasoning,
    allMessages,
    isLoadingMessages,
    status,
    onSend,
    onCopy,
    onRegenerate,
    hasAnyMessages,
    model,
  };
}
