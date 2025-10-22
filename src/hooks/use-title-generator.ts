import { useEffect } from "react";
import { generateTitle, detectContextChange } from "@/lib/generate-title";
import { getConversation } from "@/lib/chat";

interface Message {
  id: string;
  role: string;
  parts?: any[];
}

interface UseTitleGeneratorProps {
  convId: string | undefined;
  model: any;
  allMessages: Message[];
  titleGeneratedRef: React.MutableRefObject<boolean>;
  messagesSinceLastTitleUpdateRef: React.MutableRefObject<number>;
  lastTitleUpdateRef: React.MutableRefObject<number>;
}

export function useTitleGenerator({
  convId,
  model,
  allMessages,
  titleGeneratedRef,
  messagesSinceLastTitleUpdateRef,
  lastTitleUpdateRef,
}: UseTitleGeneratorProps) {
  // Generate title after first user message is saved
  const generateInitialTitle = async (firstUserMessage: Message) => {
    if (!convId || !model || titleGeneratedRef.current) {
      return;
    }

    titleGeneratedRef.current = true;
    try {
      await generateTitle({
        chatId: convId,
        firstMessage: firstUserMessage,
        model: model,
      });
    } catch (error) {
      console.error("Failed to generate title:", error);
    }
  };

  // Context change detection - runs after messages are updated
  useEffect(() => {
    const checkContextChange = async () => {
      if (
        !convId ||
        !titleGeneratedRef.current ||
        !model ||
        allMessages.length < 6
      ) {
        return;
      }

      // Increment message counter when new messages are added
      if (allMessages.length > 0) {
        messagesSinceLastTitleUpdateRef.current += 1;
      }

      // Check for context changes every 4-6 messages, with a minimum time interval
      const timeSinceLastUpdate = Date.now() - lastTitleUpdateRef.current;
      const shouldCheckContext =
        messagesSinceLastTitleUpdateRef.current >= 4 &&
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
            messagesSinceLastUpdate: messagesSinceLastTitleUpdateRef.current,
          });

          if (contextChangeResult.hasChanged) {
            console.log(
              `Title updated from "${currentTitle}" to "${contextChangeResult.newTitle}"`,
            );
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

  return {
    generateInitialTitle,
  };
}
