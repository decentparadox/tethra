"use client";

import { useEffect, useState } from "react";
import { Mic as MicIcon, Globe as GlobeIcon } from "lucide-react";
import { MessageSkeleton } from "@/components/ui/message-skeleton";
import { useStickToBottom } from "use-stick-to-bottom";
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
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';

// Import new components
import { ChatHeader } from "./chat-header";
import { EmptyChatState } from "./empty-chat-state";
import { MessageList } from "./message-list";
import { ChatContainer } from "./chat-container";

// Import custom hook
import { useChatLogic } from "@/hooks/use-chat-logic";

export default function ChatView({
  conversationId,
}: {
  conversationId?: string;
}) {
  const [speeds] = useState<Record<string, number>>({});
  const instance = useStickToBottom({
    initial: "instant",
    resize: "instant",
  });

  const {
    input,
    setInput,
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
    ref: virtualizerRef
  } = useChatLogic(conversationId);

  // Auto-scroll for new messages
  useEffect(() => {
    if (status === "streaming") {
      // Auto-scroll logic handled by Virtualizer and StickToBottom
    }
  }, [status, allMessages.length]);

  return (
    <ChatContainer
      hasAnyMessages={hasAnyMessages}
      isLoadingMessages={isLoadingMessages}
      instance={instance}
      virtualizerRef={virtualizerRef}
    >
      {isLoadingMessages ? (
        <div className="flex items-center justify-center h-full">
          <MessageSkeleton />
        </div>
      ) : (
        <>
          {hasAnyMessages ? (
            <MessageList
              ref={virtualizerRef}
              messages={allMessages}
              status={status}
              speeds={speeds}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
            />
          ) : (
            <EmptyChatState />
          )}
        </>
      )}

      <PromptInput onSubmit={onSend} className="" globalDrop multiple>
        <PromptInputBody>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
            placeholder="Ask Tethra"
          />
        </PromptInputBody>
        <PromptInputToolbar className={`${hasAnyMessages ? '' : 'mb-4'}`}>
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
    </ChatContainer>
  );
}

