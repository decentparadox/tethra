"use client";
import { cn } from "../lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";
import { CodeBlock, CodeBlockCopyButton } from "./ui/code-block";
import type { Components } from "react-markdown";

type ResponseProps = ComponentProps<typeof Streamdown>;
function extractLanguage(className?: string): string {
	if (!className) return "plaintext";

	const match = className.match(/language-(\w+)/);

	return match ? match[1] : "plaintext";
}

const INITIAL_COMPONENTS: Partial<Components> = {
	code: function CodeComponent(props) {
		const isInline =
			!props.node?.position?.start.line ||
			props.node?.position?.start.line === props.node?.position?.end.line;

		if (isInline) {
			return (
				<span className={cn("bg-muted rounded-sm px-1 font-mono text-sm")}>
					{props.children}
				</span>
			);
		}

		const language = extractLanguage(props.className);

		return (
			<CodeBlock
				code={props.children as string}
				language={language?.trim() || "plaintext"}
			>
				<CodeBlockCopyButton
					onCopy={() => console.log("Copied code to clipboard")}
					onError={() => console.error("Failed to copy code to clipboard")}
				/>
			</CodeBlock>
		);
	},
};
export const Response = memo(
	({ className, components = INITIAL_COMPONENTS, ...props }: ResponseProps) => (
		<Streamdown
			components={components}
			className={cn(
				"size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
				className,
			)}
			{...props}
		/>
	),
	(prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";
