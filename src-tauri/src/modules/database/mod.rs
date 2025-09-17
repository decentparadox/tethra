use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use rusqlite::{Connection, params};
use chrono::Utc;
use tauri::Manager;
use crate::modules::utils::uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub archived: i64,
    pub model: Option<String>,
}

// Legacy Message struct for backward compatibility
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String, // "user" | "assistant"
    pub content: String,
    pub created_at: String,
}

// AI SDK compatible message struct
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIMessage {
    pub id: String,
    pub role: String, // "user" | "assistant" | "system"
    pub parts: Vec<MessagePart>,
    pub conversation_id: String,
    pub created_at: String,
}

// Message part for multimodal content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessagePart {
    #[serde(rename = "type")]
    pub part_type: String, // "text" | "image" | "step-start" | etc.
    pub text: Option<String>,
    pub image: Option<String>,
    pub state: Option<String>, // For assistant messages, e.g. "done"
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateConversationInput { 
    pub title: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AddMessageInput { 
    pub conversation_id: String, 
    pub role: String, 
    pub content: String 
}

// AI SDK compatible message input
#[derive(Debug, Clone, Deserialize)]
pub struct AddAIMessageInput {
    pub conversation_id: String,
    pub role: String,
    pub content: serde_json::Value // Can be string or array of parts
}

// Complete message data input for storing full AI SDK messages
#[derive(Debug, Clone, Deserialize)]
pub struct SaveCompleteMessageInput {
    pub conversation_id: String,
    pub message: serde_json::Value // Full AI SDK message object
}

pub fn db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut dir = app.path().app_data_dir().map_err(|e| format!("paths: {e}"))?;
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("create app data dir: {e}"))?;
    }
    dir.push("app.db");
    Ok(dir)
}

pub fn get_conn(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let conn = Connection::open(path).map_err(|e| format!("open db: {e}"))?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at TEXT NOT NULL,
          archived INTEGER NOT NULL DEFAULT 0,
          model TEXT
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at
          ON messages(conversation_id, created_at);
        "#,
    ).map_err(|e| format!("migrate: {e}"))?;
    // Try to add archived column if upgrading
    let _ = conn.execute("ALTER TABLE conversations ADD COLUMN archived INTEGER NOT NULL DEFAULT 0", []);
    // Try to add model column if upgrading
    let _ = conn.execute("ALTER TABLE conversations ADD COLUMN model TEXT", []);
    Ok(conn)
}



#[tauri::command]
pub async fn db_list_conversations(app: tauri::AppHandle) -> Result<Vec<Conversation>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn.prepare("SELECT id, title, created_at, archived, model FROM conversations ORDER BY datetime(created_at) DESC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Conversation {
            id: row.get(0)?,
            title: row.get(1)?,
            created_at: row.get(2)?,
            archived: row.get(3)?,
            model: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
pub async fn db_get_messages(app: tauri::AppHandle, conversation_id: String) -> Result<Vec<Message>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn.prepare("SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY datetime(created_at) ASC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([conversation_id], |row| {
        Ok(Message {
            id: row.get(0)?,
            conversation_id: row.get(1)?,
            role: row.get(2)?,
            content: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
pub async fn db_create_conversation(app: tauri::AppHandle, input: Option<CreateConversationInput>) -> Result<Conversation, String> {
    let conn = get_conn(&app)?;
    let id = format!("{}", uuid());
    let created_at = Utc::now().to_rfc3339();
    let title = input.as_ref().and_then(|i| i.title.clone()).unwrap_or_else(|| "New Chat".to_string());
    let model = input.as_ref().and_then(|i| i.model.clone());
    conn.execute(
        "INSERT INTO conversations (id, title, created_at, archived, model) VALUES (?, ?, ?, 0, ?)",
        params![id, title, created_at, model],
    ).map_err(|e| e.to_string())?;
    Ok(Conversation { id, title, created_at, archived: 0, model })
}

#[tauri::command]
pub async fn db_add_message(app: tauri::AppHandle, input: AddMessageInput) -> Result<Message, String> {
    let conn = get_conn(&app)?;
    let id = format!("{}", uuid());
    let created_at = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        params![id, input.conversation_id, input.role, input.content, created_at],
    ).map_err(|e| e.to_string())?;
    Ok(Message { 
        id, 
        conversation_id: input.conversation_id, 
        role: input.role, 
        content: input.content, 
        created_at 
    })
}

#[tauri::command]
pub async fn db_delete_conversation(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    conn.execute("DELETE FROM messages WHERE conversation_id = ?", params![id]).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM conversations WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn db_archive_conversation(app: tauri::AppHandle, id: String, archived: bool) -> Result<(), String> {
    let conn = get_conn(&app)?;
    conn.execute("UPDATE conversations SET archived = ? WHERE id = ?", params![if archived {1} else {0}, id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn db_update_conversation_title(app: tauri::AppHandle, id: String, title: String) -> Result<Conversation, String> {
    let conn = get_conn(&app)?;
    conn.execute("UPDATE conversations SET title = ? WHERE id = ?", params![title, id]).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, title, created_at, archived, model FROM conversations WHERE id = ?").map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let id_v: String = row.get(0).map_err(|e| e.to_string())?;
        let title_v: String = row.get(1).map_err(|e| e.to_string())?;
        let created_v: String = row.get(2).map_err(|e| e.to_string())?;
        let archived_v: i64 = row.get(3).map_err(|e| e.to_string())?;
        let model_v: Option<String> = row.get(4).map_err(|e| e.to_string())?;
        return Ok(Conversation { id: id_v, title: title_v, created_at: created_v, archived: archived_v, model: model_v });
    }
    Err("conversation not found".into())
}

#[tauri::command]
pub async fn db_generate_conversation_title(app: tauri::AppHandle, conversation_id: String, model: Option<String>) -> Result<Conversation, String> {
    let _ = dotenvy::dotenv();
    let conn = get_conn(&app)?;
    use rusqlite::OptionalExtension;
    use crate::modules::settings::setup_provider_env_for_model;
    
    // fetch first user message
    let first_user: Option<String> = conn
        .query_row(
            "SELECT content FROM messages WHERE conversation_id = ? AND role = 'user' ORDER BY datetime(created_at) ASC LIMIT 1",
            params![conversation_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let prompt = first_user.unwrap_or_else(|| "New Chat".to_string());
    use genai::Client;
    use genai::chat::{ChatMessage, ChatRequest};
    let client = Client::default();
    let system = "Return a short, descriptive chat title (max 6 words). No quotes or trailing punctuation.";
    let req = ChatRequest::new(vec![ChatMessage::system(system), ChatMessage::user(&prompt)]);
    let model_name = model.unwrap_or_else(|| "gemini-1.5-flash".to_string());
    setup_provider_env_for_model(&app, &model_name);
    let mut title = client.exec_chat(&model_name, req, None)
        .await
        .map_err(|e| e.to_string())?
        .first_text()
        .unwrap_or("New Chat")
        .trim()
        .to_string();
    if title.ends_with('.') { title.pop(); }
    if title.is_empty() { title = "New Chat".to_string(); }

    conn.execute("UPDATE conversations SET title = ? WHERE id = ?", params![title, conversation_id]).map_err(|e| e.to_string())?;
    let mut stmt2 = conn.prepare("SELECT id, title, created_at, archived, model FROM conversations WHERE id = ?").map_err(|e| e.to_string())?;
    let mut rows = stmt2.query(params![conversation_id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let id_v: String = row.get(0).map_err(|e| e.to_string())?;
        let title_v: String = row.get(1).map_err(|e| e.to_string())?;
        let created_v: String = row.get(2).map_err(|e| e.to_string())?;
        let archived_v: i64 = row.get(3).map_err(|e| e.to_string())?;
        let model_v: Option<String> = row.get(4).map_err(|e| e.to_string())?;
        return Ok(Conversation { id: id_v, title: title_v, created_at: created_v, archived: archived_v, model: model_v });
    }
    Err("conversation not found".into())
}

#[tauri::command]
pub async fn db_update_conversation_model(app: tauri::AppHandle, conversation_id: String, model: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    conn.execute(
        "UPDATE conversations SET model = ? WHERE id = ?", 
        params![model, conversation_id]
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn db_get_conversation(app: tauri::AppHandle, conversation_id: String) -> Result<Conversation, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn.prepare("SELECT id, title, created_at, archived, model FROM conversations WHERE id = ?").map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![conversation_id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let id: String = row.get(0).map_err(|e| e.to_string())?;
        let title: String = row.get(1).map_err(|e| e.to_string())?;
        let created_at: String = row.get(2).map_err(|e| e.to_string())?;
        let archived: i64 = row.get(3).map_err(|e| e.to_string())?;
        let model: Option<String> = row.get(4).map_err(|e| e.to_string())?;
        return Ok(Conversation { id, title, created_at, archived, model });
    }
    Err("conversation not found".into())
}

// AI SDK compatible functions
#[tauri::command]
pub async fn db_get_ai_messages(app: tauri::AppHandle, conversation_id: String) -> Result<Vec<serde_json::Value>, String> {
    let conn = get_conn(&app)?;
    
    // First, check total message count in database
    let mut count_stmt = conn.prepare("SELECT COUNT(*) FROM messages WHERE conversation_id = ?").map_err(|e| e.to_string())?;
    let _count: i64 = count_stmt.query_row([conversation_id.clone()], |row| row.get(0)).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT content FROM messages WHERE conversation_id = ? ORDER BY datetime(created_at) ASC").map_err(|e| e.to_string())?;

    let mut messages = Vec::new();
    let rows = stmt.query_map([conversation_id.clone()], |row| {
        let content_str: String = row.get(0)?;
        Ok(content_str)
    }).map_err(|e| e.to_string())?;

    for row_result in rows {
        let content_str = row_result.map_err(|e| e.to_string())?;
        
        // Parse as JSON (AI SDK message format)
        match serde_json::from_str::<serde_json::Value>(&content_str) {
            Ok(json_message) => {
                messages.push(json_message);
            },
            Err(_e) => {
            }
        }
    }

    Ok(messages)
}

#[tauri::command]
pub async fn db_add_ai_message(app: tauri::AppHandle, input: AddAIMessageInput) -> Result<AIMessage, String> {
    let conn = get_conn(&app)?;
    let id = format!("{}", uuid());
    let created_at = Utc::now().to_rfc3339();

    // Construct the full AI SDK message structure
    let parts = match &input.content {
        serde_json::Value::String(text) => vec![MessagePart {
            part_type: "text".to_string(),
            text: Some(text.clone()),
            image: None,
            state: None,
        }],
        _ => vec![MessagePart {
            part_type: "text".to_string(),
            text: Some(serde_json::to_string(&input.content).unwrap_or_default()),
            image: None,
            state: None,
        }],
    };

    let message = AIMessage {
        id: id.clone(),
        role: input.role.clone(),
        parts,
        conversation_id: input.conversation_id.clone(),
        created_at: created_at.clone(),
    };

    // Serialize the full message structure
    let message_json = serde_json::to_string(&message)
        .map_err(|e| format!("Failed to serialize message: {}", e))?;

    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        params![id, input.conversation_id, input.role, message_json, created_at],
    ).map_err(|e| e.to_string())?;

    Ok(message)
}

#[tauri::command]
pub async fn db_save_complete_message(app: tauri::AppHandle, input: SaveCompleteMessageInput) -> Result<(), String> {
    let conn = get_conn(&app)?;

    // Add conversation_id and created_at to the message if not present
    let mut message_with_meta = input.message.clone();
    if !message_with_meta["conversation_id"].is_string() {
        message_with_meta["conversation_id"] = serde_json::Value::String(input.conversation_id.clone());
    }
    if !message_with_meta["created_at"].is_string() {
        message_with_meta["created_at"] = serde_json::Value::String(chrono::Utc::now().to_rfc3339());
    }

    // Store the complete message as JSON
    let message_json = serde_json::to_string(&message_with_meta)
        .map_err(|e| format!("Failed to serialize message: {}", e))?;

    // Extract values for database insertion
    let message_id = message_with_meta["id"].as_str().unwrap_or("unknown");
    let role = message_with_meta["role"].as_str().unwrap_or("unknown");
    let default_created_at = chrono::Utc::now().to_rfc3339();
    let created_at = message_with_meta["created_at"].as_str().unwrap_or(&default_created_at);

    // Insert the message
    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        params![message_id, input.conversation_id, role, message_json, created_at],
    ).map_err(|e| format!("Failed to save message: {}", e))?;

    Ok(())
}