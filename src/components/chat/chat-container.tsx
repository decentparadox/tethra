import type { FC, ReactNode } from "react";
import { Virtualizer, type VirtualizerHandle } from "virtua";
import { StickToBottom } from "use-stick-to-bottom";

interface ChatContainerProps {
	hasAnyMessages: boolean;
	isLoadingMessages: boolean;
	children: ReactNode;
	instance: any;
	virtualizerRef: React.RefObject<VirtualizerHandle>;
}

export const ChatContainer: FC<ChatContainerProps> = ({
	hasAnyMessages,
	isLoadingMessages,
	children,
	instance,
	virtualizerRef,
}) => {
	return (
		<StickToBottom className="" instance={instance}>
			<Virtualizer
				as={StickToBottom.Content}
				ref={virtualizerRef}
				scrollRef={instance.scrollRef}
				ssrCount={5}
				overscan={1}
			>
				<div
					className={`flex flex-col h-[calc(100dvh-48px)] p-4 ${
						hasAnyMessages || isLoadingMessages
							? "bg-transparent"
							: "bg-transparent"
					}`}
				>
					{children}
				</div>
			</Virtualizer>
		</StickToBottom>
	);
};
