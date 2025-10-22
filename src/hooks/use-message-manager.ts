import { useState, useEffect, useRef } from "react";
import { getMessages, saveCompleteMessage } from "@/lib/chat";

interface Message {
  id: string;
  role: string;
  parts?: any[];
  metadata?: any;
}

export function useMessageManager(
  convId: string | undefined,
  newMessages: Message[],
  model: any,
) {
  const [dbMessages, setDbMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const savedMessageIdsRef = useRef<Set<string>>(new Set());
  const titleGeneratedRef = useRef<boolean>(false);
  const messagesSinceLastTitleUpdateRef = useRef<number>(0);
  const lastTitleUpdateRef = useRef<number>(Date.now());
  const lastConversationIdRef = useRef<string | undefined>(convId);
  const [forceSaveAssistantMessages, setForceSaveAssistantMessages] =
    useState(false);
  const completeTextRef = useRef<string | null>(null);
  const usageDataRef = useRef<any>(null);

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

      // Process messages to inject complete text and usage data if available
      const messagesToProcess = newMessages.map((msg, index, arr) => {
        const lastAssistantIndex = arr.map((m, i) => m.role === "assistant" ? i : -1).filter(i => i !== -1).pop();
        const isLastAssistantMessage = 
          msg.role === "assistant" && 
          index === lastAssistantIndex;
        
        if (isLastAssistantMessage) {
          const updatedMsg = { ...msg };
          
          // Inject complete text
          if (completeTextRef.current) {
            updatedMsg.parts = [
              ...(msg.parts?.filter((p: any) => p.type === "reasoning") || []),
              {
                type: "text",
                text: completeTextRef.current,
                state: "done",
              },
            ];
          }
          
          // Inject usage data as metadata
          if (usageDataRef.current) {
            updatedMsg.metadata = {
              ...updatedMsg.metadata,
              usage: usageDataRef.current,
            };
          }
          
          return updatedMsg;
        }
        return msg;
      });

      for (const message of messagesToProcess) {
        // User messages are immediately complete, assistant messages need state: "done"
        const isUserMessage = message.role === "user";
        const isDone = message.parts?.some(
          (part: any) => part.state === "done",
        );
        const isAssistantMessage = message.role === "assistant";
        // Force save assistant messages when AI response finishes
        const shouldForceSave =
          isAssistantMessage && forceSaveAssistantMessages;
        const isComplete = isUserMessage || isDone || shouldForceSave;

        if (!savedMessageIdsRef.current.has(message.id) && isComplete) {
          try {
            await saveCompleteMessage(convId, message);
            savedMessageIdsRef.current.add(message.id);
            savedAny = true;
          } catch (error) {
            console.error("Failed to save message:", message.id, error);
          }
        }
      }

      // After saving, reload from database if we saved anything
      if (savedAny) {
        await loadMessagesFromDb();
      }
    };

    saveNewMessages();
  }, [
    newMessages,
    convId,
    model,
    dbMessages.length,
    forceSaveAssistantMessages,
  ]);

  // Combined messages: database messages + only unsaved streaming messages
  const dbMessageIds = new Set(dbMessages.map((msg) => msg.id));
  
  // Process new messages - inject complete text and usage data if available
  const processedNewMessages = newMessages.map((msg, index, arr) => {
    // If we have complete text and this is the last assistant message, inject it
    const lastAssistantIndex = arr.map((m, i) => m.role === "assistant" ? i : -1).filter(i => i !== -1).pop();
    const isLastAssistantMessage = 
      msg.role === "assistant" && 
      index === lastAssistantIndex;
    
    if (isLastAssistantMessage) {
      const updatedMsg = { ...msg };
      
      // Inject complete text
      if (completeTextRef.current) {
        updatedMsg.parts = [
          ...(msg.parts?.filter((p: any) => p.type === "reasoning") || []),
          {
            type: "text",
            text: completeTextRef.current,
            state: "done",
          },
        ];
      }
      
      // Inject usage data as metadata
      if (usageDataRef.current) {
        updatedMsg.metadata = {
          ...updatedMsg.metadata,
          usage: usageDataRef.current,
        };
      }
      
      return updatedMsg;
    }
    return msg;
  });
  
  // Filter out messages that are already in DB
  const unseenNewMessages = processedNewMessages.filter(
    (msg) => !dbMessageIds.has(msg.id),
  );
  
  const allMessages = [...dbMessages, ...unseenNewMessages];

  // Listen for AI response completion events
  useEffect(() => {
    const handleAiResponseFinished = (e: Event) => {
      const customEvent = e as CustomEvent;
      
      // Store the complete text and usage data
      if (customEvent.detail.text) {
        completeTextRef.current = customEvent.detail.text;
      }
      
      // Store usage data
      if (customEvent.detail.totalUsage) {
        usageDataRef.current = customEvent.detail.totalUsage;
      }
      
      // Find the last assistant message and clear its saved status so it can be re-saved
      const lastAssistantMsg = [...newMessages].reverse().find((msg) => msg.role === "assistant");
      if (lastAssistantMsg) {
        savedMessageIdsRef.current.delete(lastAssistantMsg.id);
      }
      
      // Toggle to trigger re-save of assistant messages
      setForceSaveAssistantMessages((prev) => !prev);
    };

    window.addEventListener("ai-response-finished", handleAiResponseFinished);

    return () => {
      window.removeEventListener("ai-response-finished", handleAiResponseFinished);
    };
  }, [newMessages]);

  // Reset state when conversation changes
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

  return {
    dbMessages,
    allMessages,
    isLoadingMessages,
    savedMessageIdsRef,
    titleGeneratedRef,
    messagesSinceLastTitleUpdateRef,
    lastTitleUpdateRef,
    loadMessagesFromDb,
  };
}
