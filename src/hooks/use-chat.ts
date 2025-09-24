import type {
	UIMessage,
	UseChatOptions,
	// useChat as useChatSDK,
} from "@ai-sdk/react";
import { useChat as useChatZustand } from "ai-sdk-zustand";
import type { ChatInit, LanguageModel } from "ai";
import { useEffect, useRef } from "react";
import { CustomChatTransport } from "../components/custom-chat-transport";

type CustomChatOptions = Omit<ChatInit<UIMessage>, "transport"> &
	Pick<UseChatOptions<UIMessage>, "experimental_throttle" | "resume">;

// This is a wrapper around the AI SDK's useChat hook
// It implements model switching and uses the custom chat transport,
// making a nice reusable hook for chat functionality.
export function useChat(
	model: LanguageModel,
	options?: CustomChatOptions & { initialMessages?: UIMessage[] },
) {
	const transportRef = useRef<CustomChatTransport | null>(null); // Using a ref here so we can update the model used in the transport without having to reload the page or recreate the transport

	if (!transportRef.current) {
		transportRef.current = new CustomChatTransport(model);
	}

	useEffect(() => {
		if (transportRef.current) {
			transportRef.current.updateModel(model);
		}
	}, [model]);

	const chatResult = useChatZustand({
		transport: transportRef.current,
		initialMessages: options?.initialMessages,
		...options,
	});

	return chatResult;
}
