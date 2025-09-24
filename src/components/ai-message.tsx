import { Copy, RefreshCw } from "lucide-react";
import { Response } from "./response";
import { TextShimmer } from "./ui/text-shimmer";
import {
	Reasoning,
	ReasoningTrigger,
	ReasoningContent,
} from "./ai-elements/reasoning";
import { Message, MessageContent } from "@/components/ai-elements/message";

interface AIMessageProps {
	message: any; // Use any for now to work with AI SDK types
	status?: "submitted" | "streaming" | "ready" | "error";
	onCopy?: () => void;
	onRegenerate?: () => void;
	tokensPerSecond?: number;
}

export function AIMessage({
	message,
	status,
	onCopy,
	onRegenerate,
	tokensPerSecond,
}: AIMessageProps) {
	return (
		<div className="text-left">
			<div className="mb-1 flex flex-col items-start gap-2 text-white/80">
				<div className="flex items-center gap-2">
					<img src="/logo.svg" alt="Tethra" className="h-5 w-5" />
					<span className="font-medium">Tethra</span>
				</div>
				{status === "submitted" && (
					<TextShimmer className="text-sm" duration={1} spread={1}>
						Tethra is thinking
					</TextShimmer>
				)}
			</div>
			<div className="w-full text-white">
				{/* {console.log("Message", message)} */}
				{/* Handle AI SDK message content structure */}
				{/* {message.content && (
          <Response>{message.content}</Response>
        )} */}
				<Message from={message.role} key={message.id}>
					<MessageContent variant="flat">
						{message.parts?.map((part: any, index: number) => {
							switch (part.type) {
								case "text":
									return (
										<Response key={`${message.id}-${index}`}>
											{part.text}
										</Response>
									);
								case "reasoning":
									return (
										<Reasoning
											key={`${message.id}-${index}`}
											isStreaming={
												status === "streaming" &&
												index === message.parts.length - 1
											}
										>
											<ReasoningTrigger />
											<ReasoningContent>{part.text}</ReasoningContent>
										</Reasoning>
									);
								default:
									return null;
							}
						})}
					</MessageContent>
				</Message>
				{status === "ready" && (
					<div className="mt-3 flex items-center gap-3 text-xs text-white/60">
						<button
							className="hover:text-white/90"
							onClick={onCopy}
							title="Copy"
						>
							<span className="inline-flex items-center gap-1">
								<Copy size={14} /> Copy
							</span>
						</button>
						<button
							className="hover:text-white/90"
							onClick={onRegenerate}
							title="Regenerate"
						>
							<span className="inline-flex items-center gap-2">
								<RefreshCw size={14} />
								Regenerate
								{tokensPerSecond && (
									<span className="ml-1 opacity-80">
										• {Math.round(tokensPerSecond)} tokens/sec
									</span>
								)}
							</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
