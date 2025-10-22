import { generateText } from "ai";
import { updateConversationTitle } from "./chat";
interface GenerateTitleProps {
  chatId: string;
  firstMessage: any;
  model: any;
}

interface DetectContextChangeProps {
  chatId: string;
  recentMessages: any[];
  model: any;
  currentTitle: string;
  messagesSinceLastUpdate?: number;
}

export async function generateTitle(props: GenerateTitleProps) {
  const { chatId, firstMessage, model } = props;

  let title = "New Chat";

  try {
    // Extract text content from the first message
    const messageText =
      firstMessage.parts
        ?.filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("") ||
      firstMessage.content ||
      "";

    if (!messageText.trim()) {
      return title;
    }

    const { text } = await generateText({
      model: model,
      messages: [
        {
          role: "user",
          content: messageText,
        },
      ],
      system: `Generate a concise, descriptive title (3-8 words) for this chat based on the user's first message. Focus on the main topic or question being asked. Return only the title without quotes or extra formatting.`,
    });

    // Clean up the generated title
    title = text.replace(/^["']|["']$/g, "").trim();
    title = title.length > 50 ? title.substring(0, 47) + "..." : title;

    // Fallback if title is empty or too short
    if (!title || title.length < 3) {
      title =
        messageText.length > 30
          ? messageText.substring(0, 27) + "..."
          : messageText || "New Chat";
    }
  } catch (error) {
    console.error("Failed to generate title:", error);
    // Fallback to first few words of the message
    const messageText =
      firstMessage.parts
        ?.filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("") ||
      firstMessage.content ||
      "";

    if (messageText.trim()) {
      title =
        messageText.length > 30
          ? messageText.substring(0, 27) + "..."
          : messageText;
    }
  }

  try {
    // Update the conversation title in the database
    await updateConversationTitle(chatId, title);
    return title;
  } catch (error) {
    console.error("Failed to update conversation title:", error);
    return title;
  }
}

export async function detectContextChange(
  props: DetectContextChangeProps,
): Promise<{ hasChanged: boolean; newTitle?: string }> {
  const {
    chatId,
    recentMessages,
    model,
    currentTitle,
    messagesSinceLastUpdate = 0,
  } = props;

  // Don't check for context changes too frequently
  if (messagesSinceLastUpdate < 4 || recentMessages.length < 4) {
    return { hasChanged: false };
  }

  // Get the last 6 messages for context analysis
  const contextMessages = recentMessages.slice(-6);

  // Extract text content from messages for analysis
  const conversationText = contextMessages
    .map((msg) => {
      const text =
        msg.parts
          ?.filter((part: any) => part.type === "text")
          .map((part: any) => part.text)
          .join("") ||
        msg.content ||
        "";
      return `${msg.role}: ${text}`;
    })
    .join("\n");

  try {
    const { text } = await generateText({
      model,
      messages: [
        {
          role: "user",
          content: `Current conversation title: "${currentTitle}"

Recent conversation:
${conversationText}

Based on the recent conversation, has the main topic or context significantly changed from what the title suggests?

If yes, suggest a new title that better reflects the current topic (3-8 words, no quotes).
If no, respond with "NO_CHANGE".

Response format:
- If context changed: NEW_TITLE: [your suggested title]
- If context unchanged: NO_CHANGE`,
        },
      ],
      system:
        "You are analyzing conversation context changes. Be conservative - only suggest title changes when there's a clear, significant shift in the main topic of discussion.",
    });

    const response = text.trim();

    if (response === "NO_CHANGE") {
      return { hasChanged: false };
    }

    if (response.startsWith("NEW_TITLE:")) {
      const newTitle = response.replace("NEW_TITLE:", "").trim();

      // Clean up the suggested title
      const cleanedTitle = newTitle.replace(/^["']|["']$/g, "").trim();

      if (
        cleanedTitle &&
        cleanedTitle.length >= 3 &&
        cleanedTitle !== currentTitle
      ) {
        try {
          // Update the conversation title in the database
          await updateConversationTitle(chatId, cleanedTitle);
          return { hasChanged: true, newTitle: cleanedTitle };
        } catch (error) {
          console.error("Failed to update conversation title:", error);
          return { hasChanged: false };
        }
      }
    }

    return { hasChanged: false };
  } catch (error) {
    console.error("Failed to detect context change:", error);
    return { hasChanged: false };
  }
}
