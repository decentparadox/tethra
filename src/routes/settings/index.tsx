import { createFileRoute } from "@tanstack/react-router";
import DashboardLayout from "@/components/dashboard";
import SettingsTabs from "./_SettingsTabs";
import GlobalShortcuts from "@/components/global-shortcuts";
export const Route = createFileRoute("/settings/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex flex-col w-full h-full no-scrollbar">
			<DashboardLayout>
				<GlobalShortcuts />
				<SettingsTabs />
			</DashboardLayout>
		</div>
	);
}
