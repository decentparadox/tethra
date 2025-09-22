import { useState, useEffect, useRef } from "react";
import { getMessages, saveCompleteMessage } from "@/lib/chat";

interface Message {
  id: string;
  role: string;
  parts?: any[];
}

export function useMessageManager(convId: string | undefined, newMessages: Message[], model: any) {
  const [dbMessages, setDbMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const savedMessageIdsRef = useRef<Set<string>>(new Set());
  const titleGeneratedRef = useRef<boolean>(false);
  const messagesSinceLastTitleUpdateRef = useRef<number>(0);
  const lastTitleUpdateRef = useRef<number>(Date.now());
  const lastConversationIdRef = useRef<string | undefined>(convId);
  const [forceSaveAssistantMessages, setForceSaveAssistantMessages] = useState(false);

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

      for (const message of newMessages) {
        // User messages are immediately complete, assistant messages need state: "done"
        const isUserMessage = message.role === "user";
        const isDone = message.parts?.some((part: any) => part.state === "done");
        const isAssistantMessage = message.role === "assistant";
        // Force save assistant messages when AI response finishes
        const shouldForceSave = isAssistantMessage && forceSaveAssistantMessages;
        const isComplete = isUserMessage || isDone || shouldForceSave;

        if (!savedMessageIdsRef.current.has(message.id) && isComplete) {
          try {
            await saveCompleteMessage(convId, message);
            savedMessageIdsRef.current.add(message.id);
            savedAny = true;

            // Check if this is the first user message for title generation
            // Note: Title generation is now handled in useTitleGenerator hook
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
  }, [newMessages, convId, model, dbMessages.length, forceSaveAssistantMessages]);

  // Combined messages: database messages + only unsaved streaming messages
  const dbMessageIds = new Set(dbMessages.map(msg => msg.id));
  const unseenNewMessages = newMessages.filter(msg => !dbMessageIds.has(msg.id));
  const allMessages = [...dbMessages, ...unseenNewMessages];

  // Listen for AI response completion events
  useEffect(() => {
    const handleAiResponseFinished = () => {
      setForceSaveAssistantMessages(prev => !prev);
    };

    window.addEventListener('ai-response-finished', handleAiResponseFinished);
    return () => window.removeEventListener('ai-response-finished', handleAiResponseFinished);
  }, []);

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
    loadMessagesFromDb
  };
}
