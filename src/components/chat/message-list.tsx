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
	modelId?: string;
}

export const MessageList = ({
	messages,
	status,
	speeds,
	onCopy,
	onRegenerate,
	modelId,
}: MessageListProps) => {
	// Find the index of the last assistant message
	const lastAssistantMessageIndex = messages.reduce((lastIndex, message, index) => {
		return message.role === "assistant" ? index : lastIndex;
	}, -1);

	return (
		<div className="flex flex-col space-y-4 no-scrollbar">
			{messages.map((message, index) => {
				// Only the last assistant message should have streaming status
				const isLastAssistant = index === lastAssistantMessageIndex;
				const messageStatus = (message.role === "assistant" && isLastAssistant) 
					? status 
					: "ready";
				
				return (
					<div key={message.id}>
					{message.role === "assistant" ? (
						<AIMessage
							message={message}
							status={
								messageStatus as "submitted" | "streaming" | "ready" | "error"
							}
							onCopy={() => onCopy(message)}
							onRegenerate={() => onRegenerate()}
							tokensPerSecond={speeds[message.id]}
							modelId={modelId}
						/>
					) : (
						<UserMessage message={message} />
					)}
					</div>
				);
			})}
		</div>
	);
};
