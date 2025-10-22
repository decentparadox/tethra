import { cn } from "@/lib/utils";
import { FileIcon, ImageIcon, FileTextIcon, FileVideoIcon, FileAudioIcon } from "lucide-react";
import type { HTMLAttributes } from "react";

export interface FileChipProps extends HTMLAttributes<HTMLDivElement> {
	filename?: string;
	mediaType?: string;
	size?: "sm" | "md" | "lg";
}

function getFileIcon(mediaType?: string) {
	if (!mediaType) return FileIcon;
	
	if (mediaType.startsWith("image/")) return ImageIcon;
	if (mediaType.startsWith("video/")) return FileVideoIcon;
	if (mediaType.startsWith("audio/")) return FileAudioIcon;
	if (mediaType.includes("pdf") || mediaType.includes("text")) return FileTextIcon;
	
	return FileIcon;
}

function getFileExtension(filename?: string) {
	if (!filename) return "";
	const parts = filename.split(".");
	return parts.length > 1 ? parts.pop()?.toUpperCase() : "";
}

export function FileChip({
	filename,
	mediaType,
	size = "md",
	className,
	...props
}: FileChipProps) {
	const Icon = getFileIcon(mediaType);
	const extension = getFileExtension(filename);
	
	const sizeClasses = {
		sm: "h-7 px-2 text-xs gap-1.5",
		md: "h-8 px-3 text-sm gap-2",
		lg: "h-10 px-4 text-base gap-2.5",
	};

	return (
		<div
			className={cn(
				"inline-flex items-center rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm",
				"text-white/90 transition-colors hover:bg-white/15",
				sizeClasses[size],
				className,
			)}
			{...props}
		>
			<Icon className="size-4 shrink-0 text-white/70" />
			<span className="max-w-[200px] truncate font-medium">
				{filename || "Untitled"}
			</span>
			{extension && (
				<span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white/60">
					{extension}
				</span>
			)}
		</div>
	);
}

