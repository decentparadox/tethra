import { useRef, forwardRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type VirtualizerHandle } from "virtua";
import { AIMessage } from "@/components/ai-message";
import { UserMessage } from "@/components/user-message";

interface Message {
  id: string;
  role: string;
  parts?: any[];
}

interface MessageListProps {
  messages: Message[];
  status: string;
  speeds: Record<string, number>;
  onCopy: (message: Message) => void;
  onRegenerate: () => void;
}

export const MessageList = forwardRef<VirtualizerHandle, MessageListProps>(({
  messages,
  status,
  speeds,
  onCopy,
  onRegenerate
}, _ref) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  return (
    <ScrollArea className="h-full w-full rounded-md p-4 flex-1 overflow-y-auto space-y-2 no-scrollbar">
      <div className="h-full w-full overflow-y-auto">
        {/* {console.log(messages)} */}
        {messages.map((message) => (
          <div key={message.id} className="mb-4">
            {message.role === "assistant" ? (
              <AIMessage
                message={message}
                status={status as 'submitted' | 'streaming' | 'ready' | 'error'}
                onCopy={() => onCopy(message)}
                      onRegenerate={() => onRegenerate()}
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
  );
});

MessageList.displayName = "MessageList";
