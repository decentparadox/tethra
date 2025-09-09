import { type Message, type Conversation } from './chat';

interface CacheEntry {
  messages: Message[];
  lastFetched: number;
  isComplete: boolean;
}

class ChatCache {
  private cache = new Map<string, CacheEntry>();
  private conversations: Conversation[] = [];
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private preloadingSet = new Set<string>(); // Track which conversations are being preloaded

  // Cache conversations list
  setConversations(conversations: Conversation[]) {
    this.conversations = conversations;
  }

  getConversations(): Conversation[] {
    return this.conversations;
  }

  // Cache messages for a conversation
  setMessages(conversationId: string, messages: Message[], isComplete = true) {
    this.cache.set(conversationId, {
      messages: [...messages],
      lastFetched: Date.now(),
      isComplete
    });
  }

  // Get cached messages if available and fresh
  getMessages(conversationId: string): Message[] | null {
    const entry = this.cache.get(conversationId);
    if (!entry) return null;

    const isExpired = Date.now() - entry.lastFetched > this.CACHE_TTL;
    if (isExpired) {
      this.cache.delete(conversationId);
      return null;
    }

    return entry.messages;
  }

  // Add a single message to cache (for optimistic updates)
  addMessage(conversationId: string, message: Message) {
    const entry = this.cache.get(conversationId);
    if (entry) {
      entry.messages.push(message);
      entry.lastFetched = Date.now();
    }
  }

  // Update a message in cache (for streaming)
  updateMessage(conversationId: string, messageId: string, content: string) {
    const entry = this.cache.get(conversationId);
    if (entry) {
      const messageIndex = entry.messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        entry.messages[messageIndex] = {
          ...entry.messages[messageIndex],
          content
        };
      }
    }
  }



  // Check if we have any cached data for a conversation
  hasData(conversationId: string): boolean {
    return this.cache.has(conversationId);
  }

  // Clear cache for a conversation
  clear(conversationId: string) {
    this.cache.delete(conversationId);
  }

  // Clear all cache
  clearAll() {
    this.cache.clear();
    this.conversations = [];
  }

  // Preload conversations in background
  async preloadConversations(
    conversationIds: string[], 
    getMessagesFunc: (id: string) => Promise<Message[]>,
    maxConcurrent = 2
  ) {
    // Filter out already cached or currently preloading conversations
    const toPreload = conversationIds.filter(id => 
      !this.hasData(id) && !this.preloadingSet.has(id)
    );
    
    if (toPreload.length === 0) return;

    // Mark conversations as being preloaded
    toPreload.forEach(id => this.preloadingSet.add(id));

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < toPreload.length; i += maxConcurrent) {
      const batch = toPreload.slice(i, i + maxConcurrent);
      
      await Promise.allSettled(
        batch.map(async (conversationId) => {
          try {
            const messages = await getMessagesFunc(conversationId);
            this.setMessages(conversationId, messages, true);
            console.log(`✅ Preloaded conversation: ${conversationId.slice(0, 8)}...`);
          } catch (error) {
            console.log(`❌ Failed to preload conversation ${conversationId.slice(0, 8)}...`);
          } finally {
            // Remove from preloading set
            this.preloadingSet.delete(conversationId);
          }
        })
      );

      // Small delay between batches to prevent overloading
      if (i + maxConcurrent < toPreload.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Check if a conversation is currently being preloaded
  isPreloading(conversationId: string): boolean {
    return this.preloadingSet.has(conversationId);
  }

  // Get preloading status for UI indicators
  getPreloadingStatus(): { count: number; ids: string[] } {
    return {
      count: this.preloadingSet.size,
      ids: Array.from(this.preloadingSet)
    };
  }

  // Get adjacent conversation IDs for preloading
  getAdjacentConversationIds(currentId: string): { prev?: string; next?: string } {
    const currentIndex = this.conversations.findIndex(c => c.id === currentId);
    if (currentIndex === -1) return {};

    return {
      prev: this.conversations[currentIndex - 1]?.id,
      next: this.conversations[currentIndex + 1]?.id
    };
  }

  // Get recent conversation IDs (last 5) for preloading
  getRecentConversationIds(excludeId?: string): string[] {
    return this.conversations
      .filter(c => c.id !== excludeId)
      .slice(0, 5)
      .map(c => c.id);
  }
}

export const chatCache = new ChatCache();
