import { createFileRoute } from "@tanstack/react-router";
import ChatView from "@/components/chat/chat-view";
import GlobalShortcuts from "@/components/global-shortcuts";
import DashboardLayout from "@/components/dashboard";

export const Route = createFileRoute("/dashboard/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <DashboardLayout>
      <GlobalShortcuts />
      <ChatView />
    </DashboardLayout>
  );
}
