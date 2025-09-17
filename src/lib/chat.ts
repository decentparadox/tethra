import { invoke } from "@tauri-apps/api/core";
import type { UIMessage } from "@ai-sdk/react";

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  archived: number;
  model?: string;
};

// Keep the old Message type for backward compatibility during transition
export type LegacyMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

// New type that works with AI SDK
export type ConversationMessage = UIMessage & {
  conversation_id: string;
  created_at: string;
};

export type ListedModel = { model: string; adapter_kind: string; enabled: boolean };

export async function listConversations(): Promise<Conversation[]> {
  return await invoke<Conversation[]>("db_list_conversations");
}

// Legacy function - returns old format for backward compatibility
export async function getLegacyMessages(conversationId: string): Promise<LegacyMessage[]> {
  return await invoke<LegacyMessage[]>("db_get_messages", { conversationId, conversation_id: conversationId });
}

// New function - now works with AI SDK messages natively from backend
export async function getMessages(conversationId: string): Promise<any[]> {
  return await invoke<any[]>("db_get_ai_messages", { conversationId, conversation_id: conversationId });
}

export async function createConversation(title?: string, model?: string): Promise<Conversation> {
  return await invoke<Conversation>("db_create_conversation", { title, model });
}

// Legacy function for backward compatibility
export async function addLegacyMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<LegacyMessage> {
  return await invoke<LegacyMessage>("db_add_message", { input: { conversation_id: conversationId, role, content } });
}

// New function for AI SDK messages 
export async function addMessage(
  conversationId: string,
  role: "user" | "assistant", 
  content: string | any
): Promise<ConversationMessage> {
  // Convert content to appropriate format for backend
  const contentValue = typeof content === 'string' ? content : content;
  
  return await invoke<ConversationMessage>("db_add_ai_message", { 
    input: { 
      conversation_id: conversationId, 
      role, 
      content: contentValue 
    } 
  });
}

export async function streamChat(conversationId: string, userMessage: string, model?: string): Promise<void> {
  await invoke("stream_chat", { input: { conversation_id: conversationId, user_message: userMessage, model } });
}

export async function listChatModels(): Promise<ListedModel[]> {
  return await invoke<ListedModel[]>("list_chat_models");
}

export async function deleteConversation(id: string): Promise<void> {
  await invoke("db_delete_conversation", { id });
}

export async function archiveConversation(id: string, archived: boolean): Promise<void> {
  await invoke("db_archive_conversation", { id, archived });
}

export async function updateConversationTitle(id: string, title: string): Promise<Conversation> {
  return await invoke<Conversation>("db_update_conversation_title", { id, title });
}

export async function generateConversationTitle(id: string, model?: string): Promise<Conversation> {
  return await invoke<Conversation>("generate_conversation_title", { input: { conversation_id: id, model } });
}

export async function getConversation(id: string): Promise<Conversation> {
  return await invoke<Conversation>("db_get_conversation", { id });
}

export async function updateConversationModel(id: string, model: string): Promise<void> {
  await invoke("db_update_conversation_model", { id, model });
}

export async function saveCompleteMessage(conversationId: string, message: any): Promise<void> {
  await invoke("db_save_complete_message", { input: { conversation_id: conversationId, message } });
}


