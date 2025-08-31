import { invoke } from "@tauri-apps/api/core";

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  archived: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type ListedModel = { model: string; adapter_kind: string; enabled: boolean };

export async function listConversations(): Promise<Conversation[]> {
  return await invoke<Conversation[]>("db_list_conversations");
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  // send both keys to satisfy command schema (camelCase) and Rust param (snake_case)
  return await invoke<Message[]>("db_get_messages", { conversationId, conversation_id: conversationId });
}

export async function createConversation(title?: string): Promise<Conversation> {
  return await invoke<Conversation>("db_create_conversation", { input: { title } });
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<Message> {
  return await invoke<Message>("db_add_message", { input: { conversation_id: conversationId, role, content } });
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
  return await invoke<Conversation>("db_generate_conversation_title", { conversationId: id, conversation_id: id, model });
}


