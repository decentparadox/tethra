import { SidebarProvider, SidebarTrigger } from "./ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import type { ReactNode } from "react";
import ModelSelector from "./model-selector";
export default function DashboardLayout({
	children,
	conversationId,
}: { children: ReactNode; conversationId?: string }) {
	return (
		<div
			className="dark"
			onKeyDown={(e) => {
				// Ctrl+N: New chat, Ctrl+,: Settings
				if ((e.ctrlKey || e.metaKey) && (e.key === "n" || e.key === "N")) {
					e.preventDefault();
					window.location.href = "/dashboard";
				}
				if ((e.ctrlKey || e.metaKey) && e.key === ",") {
					e.preventDefault();
					window.location.href = "/settings";
				}
			}}
		>
			<SidebarProvider>
				<AppSidebar />
				<main className="flex flex-col w-full h-full">
					<div className="flex items-center gap-2 p-2">
						<SidebarTrigger />
						{typeof window !== "undefined" &&
							!location.pathname.startsWith("/settings") && (
								<ModelSelector conversationId={conversationId} />
							)}
					</div>
					{children}
				</main>
			</SidebarProvider>
		</div>
	);
}
