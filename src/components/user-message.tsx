import { Message, MessageContent } from "@/components/ai-elements/message";
import { FileChip } from "@/components/ui/file-chip";

interface UserMessageProps {
	message: any; // Use any for now to work with AI SDK types
}

export function UserMessage({ message }: UserMessageProps) {
	// Handle both AI SDK content formats
	const getMessageText = () => {
		if (message.content) {
			return message.content;
		}
		if (message.parts?.length > 0) {
			return message.parts
				.filter((part: any) => part.type === "text")
				.map((part: any) => part.text)
				.join("");
		}
		return "";
	};

	// Extract file parts from the message
	const getFileParts = () => {
		if (!message.parts?.length) return [];
		return message.parts.filter((part: any) => part.type === "file");
	};

	const fileParts = getFileParts();
	const messageText = getMessageText();

	// If we have both files and text, we need custom layout
	if (fileParts.length > 0 && messageText) {
		return (
			<div className="flex w-full flex-col items-end gap-0.5 py-4">
				{/* Display file chips outside the message bubble */}
				<div className="flex flex-wrap justify-end gap-2">
					{fileParts.map((file: any, index: number) => (
						<FileChip
							key={file.id || `file-${index}`}
							filename={file.filename}
							mediaType={file.mediaType}
						/>
					))}
				</div>
				{/* Display message text in bubble */}
				<div className="group is-user flex w-full items-end justify-end gap-2">
					<MessageContent className="group-[.is-user]:bg-white/10 group-[.is-user]:text-white">
						{messageText}
					</MessageContent>
				</div>
			</div>
		);
	}

	// If only files, show files horizontally
	if (fileParts.length > 0) {
		return (
			<div className="flex w-full flex-wrap justify-end gap-2 py-4">
				{fileParts.map((file: any, index: number) => (
					<FileChip
						key={file.id || `file-${index}`}
						filename={file.filename}
						mediaType={file.mediaType}
					/>
				))}
			</div>
		);
	}

	// If only text, use normal Message component
	return (
		<div className="">
			<Message from="user">
				<MessageContent className="group-[.is-user]:bg-white/10 group-[.is-user]:text-white">
					{messageText}
				</MessageContent>
			</Message>
		</div>
	);
}
