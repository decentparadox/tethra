import { Calendar, Home, Inbox, Search, Settings, Plus, MoreHorizontal, Trash2, Archive, Share2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { listConversations, createConversation, deleteConversation, archiveConversation, updateConversationTitle, generateConversationTitle, getMessages, type Conversation } from "../lib/chat";
import { chatCache } from "../lib/chat-cache";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarInput,
} from "@/components/ui/sidebar";

// Top application items (keep if needed elsewhere)
const items = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

const bottomNav = [
  { title: "New Chat", url: "/dashboard", icon: Plus },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const refresh = async () => {
    try {
      const list = await listConversations();
      setConversations(list);
      chatCache.setConversations(list);
      
      // Preload recent conversations in background
      setTimeout(() => {
        const recentIds = chatCache.getRecentConversationIds();
        if (recentIds.length > 0) {
          chatCache.preloadConversations(recentIds, getMessages, 2);
        }
      }, 1000); // Wait 1 second after loading conversations
      
    } catch {
      setConversations([]);
      chatCache.setConversations([]);
    }
  };

  // Handle hover on conversation items for preloading
  const handleConversationHover = (conversationId: string) => {
    if (!chatCache.hasData(conversationId) && !chatCache.isPreloading(conversationId)) {
      // Start preloading after a short delay
      setTimeout(async () => {
        if (!chatCache.hasData(conversationId)) {
          await chatCache.preloadConversations([conversationId], getMessages, 1);
        }
      }, 300); // 300ms delay
    }
  };
  useEffect(() => { void refresh(); }, []);
  // Fallback: periodically invoke backend to keep titles fresh (no event reliance)
  useEffect(() => {
    const tick = () => { if (document.visibilityState !== 'hidden') { void refresh(); } };
    const id = setInterval(tick, 1500);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, []);

  const handleNewChat = async () => {
    // Get the currently selected model from localStorage
    const selectedModel = localStorage.getItem("selected-model");
    const conv = await createConversation(undefined, selectedModel || undefined);
    await refresh();
    window.location.href = `/dashboard/${conv.id}`;
  };

  return (
    <Sidebar>
      <SidebarHeader className="flex items-start gap-2">
        <SidebarInput placeholder="Search" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.map((c) => (
                <SidebarMenuItem key={c.id}>
                  <div className="flex items-center justify-between gap-2">
                    <SidebarMenuButton asChild className="flex-1">
                      <a 
                        href={`/dashboard/${c.id}`}
                        onMouseEnter={() => handleConversationHover(c.id)}
                      >
                        <span className="truncate max-w-[150px]">{c.title}</span>
                      </a>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1.5 rounded-md hover:bg-white/10">
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={async () => { await generateConversationTitle(c.id); await refresh(); }}>
                          <Wand2 className="size-4" />
                          Generate title
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={async () => { await archiveConversation(c.id, c.archived === 0); await refresh(); }}>
                          <Archive className="size-4" />
                          {c.archived ? 'Unarchive' : 'Archive'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`${location.origin}/dashboard/${c.id}`); }}>
                          <Share2 className="size-4" />
                          Copy share link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={async () => { await deleteConversation(c.id); await refresh(); }}>
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild onClick={handleNewChat}>
              <button type="button">
                <Plus />
                <span>New Chat</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {bottomNav.slice(1).map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
