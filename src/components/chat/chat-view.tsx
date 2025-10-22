"use client";

import { useState } from "react";
import { Mic as MicIcon, Globe as GlobeIcon, BrainCircuit as BrainCircuitIcon } from "lucide-react";
import { MessageSkeleton } from "@/components/ui/message-skeleton";
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
} from "@/components/ai-elements/prompt-input";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";

// Import new components
import { EmptyChatState } from "./empty-chat-state";
import { MessageList } from "./message-list";

// Import custom hook
import { useChatLogic } from "@/hooks/use-chat-logic";

export default function ChatView({
	conversationId,
}: {
	conversationId?: string;
}) {
	const [speeds] = useState<Record<string, number>>({});

	const {
		input,
		setInput,
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
		selectedModel,
	} = useChatLogic(conversationId);

	return (
		<div className="flex flex-col h-[calc(100dvh-48px)]">
			<Conversation className="flex-1 no-scrollbar">
				<ConversationContent className={hasAnyMessages ? "p-4 no-scrollbar" : "p-0 h-full no-scrollbar"}>
					{isLoadingMessages ? (
						<div className="flex items-center justify-center h-full">
							<MessageSkeleton />
						</div>
					) : hasAnyMessages ? (
						<MessageList
							messages={allMessages}
							status={status}
							speeds={speeds}
							onCopy={onCopy}
							onRegenerate={onRegenerate}
							modelId={selectedModel}
						/>
					) : (
						<EmptyChatState />
					)}
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>

			<div className="px-4 pb-4">
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
								variant={useMicrophone ? "default" : "ghost"}
							>
								<MicIcon size={16} />
								<span className="sr-only">Microphone</span>
							</PromptInputButton>
							<PromptInputButton
								onClick={() => setUseWebSearch(!useWebSearch)}
								variant={useWebSearch ? "default" : "ghost"}
							>
								<GlobeIcon size={16} />
								<span>Search</span>
							</PromptInputButton>
							<PromptInputButton
								onClick={() => setUseReasoning(!useReasoning)}
								variant={useReasoning ? "default" : "ghost"}
								title="Enable extended reasoning (supported models only)"
							>
								<BrainCircuitIcon size={16} />
								<span>Reasoning</span>
							</PromptInputButton>
						</PromptInputTools>
						<PromptInputSubmit disabled={!input && !status} status={status} />
					</PromptInputToolbar>
				</PromptInput>
			</div>
		</div>
	);
}
