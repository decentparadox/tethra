import { createFileRoute, useParams } from '@tanstack/react-router'
import ChatView from "@/components/chat/chat-view";
import GlobalShortcuts from "@/components/global-shortcuts";
import DashboardLayout from "@/components/dashboard";

export const Route = createFileRoute('/dashboard/$id')({
  component: RouteComponent,
})

function RouteComponent() {
const { id } = useParams({ from: Route.id })
  return (
    <DashboardLayout conversationId={id}>
      <GlobalShortcuts />
      <ChatView conversationId={id} />
    </DashboardLayout>
  )
}
