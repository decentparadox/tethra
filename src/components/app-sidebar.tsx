import { Settings, Plus, MoreHorizontal, Trash2, Archive, Share2, Search, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import {
  listConversations,
  createConversation,
  deleteConversation,
  archiveConversation,
  getLegacyMessages,
  type Conversation,
} from "../lib/chat";
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
  SidebarInput,
} from "@/components/ui/sidebar";


const bottomNav = [
  { title: "New Chat", url: "/dashboard", icon: Plus },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return conversation.title.toLowerCase().includes(query);
  });
  
  const refresh = async () => {
    try {
      const list = await listConversations();
      setConversations(list);
      chatCache.setConversations(list);
      
      // Preload recent conversations in background
      setTimeout(() => {
        const recentIds = chatCache.getRecentConversationIds();
        if (recentIds.length > 0) {
          chatCache.preloadConversations(recentIds, getLegacyMessages, 2);
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
          await chatCache.preloadConversations([conversationId], getLegacyMessages, 1);
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

  // Keyboard shortcut to focus search input (Ctrl/Cmd + F)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to clear search
      if (event.key === 'Escape' && searchQuery) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

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
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-white/50" />
          <SidebarInput 
            ref={searchInputRef}
            placeholder="Search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {searchQuery ? `Search Results` : "Recents"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredConversations.length === 0 && searchQuery.trim() !== "" ? (
                <div className="px-3 py-2 text-sm text-white/60 text-center">
                  No conversations found matching "{searchQuery}"
                </div>
              ) : filteredConversations.length === 0 && conversations.length === 0 ? (
                <>
                <div className="flex items-center gap-1 text-left-panel-fg/80">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="tabler-icon tabler-icon-message-filled ">
                    <path d="M18 3a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-4.724l-4.762 2.857a1 1 0 0 1 -1.508 -.743l-.006 -.114v-2h-1a4 4 0 0 1 -3.995 -3.8l-.005 -.2v-8a4 4 0 0 1 4 -4zm-4 9h-6a1 1 0 0 0 0 2h6a1 1 0 0 0 0 -2m2 -4h-8a1 1 0 1 0 0 2h8a1 1 0 0 0 0 -2"></path>
                  </svg>
                  <h6 className="font-medium text-base">No conversation yet</h6>
                </div>
                <div className="py-2 text-white/60 text-left text-xs">
                  Start a new conversation to see your conversation history here.
                </div>
                </>
              ) : (
                filteredConversations.map((c) => (
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
                ))
              )}
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
