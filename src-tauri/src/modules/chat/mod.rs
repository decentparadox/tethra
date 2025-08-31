use serde::{Deserialize, Serialize};
use tauri::{Manager, Emitter};
use chrono::Utc;
use rusqlite::params;
use crate::modules::settings::{read_settings, setup_provider_env_for_model};
use crate::modules::database::get_conn;
use crate::modules::utils::uuid;
use crate::modules::providers::{GeminiProvider, OpenAIProvider, AnthropicProvider, OpenRouterProvider};

#[derive(Debug, Clone, Serialize)]
pub struct ChatStreamToken {
    pub conversation_id: String,
    pub token: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatStreamStart {
    pub conversation_id: String,
    pub message_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatStreamEnd {
    pub conversation_id: String,
    pub message_id: String,
    pub complete_content: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StreamChatInput { 
    pub conversation_id: String, 
    pub user_message: String, 
    pub model: Option<String> 
}

#[derive(Debug, Clone, Serialize)]
pub struct ListedModel {
    pub model: String,
    pub adapter_kind: String,
    pub enabled: bool,
}

#[tauri::command]
pub async fn stream_chat(app: tauri::AppHandle, input: StreamChatInput) -> Result<(), String> {
    let _ = dotenvy::dotenv();
    
    // Log the received model for debugging
    println!("Received model parameter: {:?}", input.model);
    
    let model = input.model.unwrap_or_else(|| {
        // Use a more sensible default - first try to get an enabled model from settings
        match read_settings(&app) {
            Ok(settings) => {
                // Try to find the first enabled model from any provider
                if settings.gemini_enabled.unwrap_or(true) && settings.gemini_api_key.is_some() {
                    "gemini-1.5-flash-latest".to_string()
                } else if settings.openai_enabled.unwrap_or(true) && (settings.openai_api_key.is_some() || settings.api_key.is_some()) {
                    "gpt-4o-mini".to_string()
                } else if settings.anthropic_enabled.unwrap_or(true) && settings.anthropic_api_key.is_some() {
                    "claude-3-haiku-20240307".to_string()
                } else {
                    // Final fallback
                    "gemini-1.5-flash-latest".to_string()
                }
            }
            Err(_) => "gemini-1.5-flash-latest".to_string()
        }
    });
    
    println!("Using model: {}", model);
    setup_provider_env_for_model(&app, &model);
    let conversation_id = input.conversation_id.clone();
    let user_text = input.user_message.clone();

    let window = app.get_webview_window("main").ok_or_else(|| "no main window".to_string())?;

    tauri::async_runtime::spawn(async move {
        // Generate message ID for this response
        let message_id = uuid();
        let created_at = Utc::now().to_rfc3339();

        // Emit stream start event
        let _ = window.emit("chat_stream_start", ChatStreamStart {
            conversation_id: conversation_id.clone(),
            message_id: message_id.clone(),
        });

        let mut complete_content = String::new();

        // Determine which provider to use based on the model
        let use_manual_streaming = model.starts_with("gemini") || 
                                  model.starts_with("gpt-") || 
                                  model.starts_with("claude-") || 
                                  model.contains("openrouter") ||
                                  model.starts_with("o1-");

        if use_manual_streaming {
            // Use manual streaming providers
            let stream_result = if model.starts_with("gemini") {
                // Gemini provider
                let api_key = std::env::var("GEMINI_API_KEY")
                    .or_else(|_| std::env::var("GOOGLE_AI_API_KEY"))
                    .unwrap_or_default();
                
                if api_key.is_empty() {
                    complete_content = "Error: Gemini API key not found. Please set GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable.".to_string();
                    None
                } else {
                    let provider = GeminiProvider::new(api_key);
                    match provider.stream_chat(&model, &user_text).await {
                        Ok(stream) => Some(stream),
                        Err(e) => {
                            eprintln!("Failed to start Gemini stream: {}", e);
                            complete_content = format!("Failed to start stream: {}", e);
                            None
                        }
                    }
                }
            } else if model.starts_with("gpt-") || model.starts_with("o1-") {
                // OpenAI provider
                let api_key = std::env::var("OPENAI_API_KEY").unwrap_or_default();
                
                if api_key.is_empty() {
                    complete_content = "Error: OpenAI API key not found. Please set OPENAI_API_KEY environment variable.".to_string();
                    None
                } else {
                    let provider = OpenAIProvider::new(api_key);
                    match provider.stream_chat(&model, &user_text).await {
                        Ok(stream) => Some(stream),
                        Err(e) => {
                            eprintln!("Failed to start OpenAI stream: {}", e);
                            complete_content = format!("Failed to start stream: {}", e);
                            None
                        }
                    }
                }
            } else if model.starts_with("claude-") {
                // Anthropic provider
                let api_key = std::env::var("ANTHROPIC_API_KEY").unwrap_or_default();
                
                if api_key.is_empty() {
                    complete_content = "Error: Anthropic API key not found. Please set ANTHROPIC_API_KEY environment variable.".to_string();
                    None
                } else {
                    let provider = AnthropicProvider::new(api_key);
                    match provider.stream_chat(&model, &user_text).await {
                        Ok(stream) => Some(stream),
                        Err(e) => {
                            eprintln!("Failed to start Anthropic stream: {}", e);
                            complete_content = format!("Failed to start stream: {}", e);
                            None
                        }
                    }
                }
            } else if model.contains("openrouter") {
                // OpenRouter provider
                let api_key = std::env::var("OPENROUTER_API_KEY").unwrap_or_default();
                
                if api_key.is_empty() {
                    complete_content = "Error: OpenRouter API key not found. Please set OPENROUTER_API_KEY environment variable.".to_string();
                    None
                } else {
                    let provider = OpenRouterProvider::new(api_key);
                    match provider.stream_chat(&model, &user_text).await {
                        Ok(stream) => Some(stream),
                        Err(e) => {
                            eprintln!("Failed to start OpenRouter stream: {}", e);
                            complete_content = format!("Failed to start stream: {}", e);
                            None
                        }
                    }
                }
            } else {
                None
            };

            // Process the stream if we got one
            if let Some(mut stream) = stream_result {
                use futures::StreamExt;
                
                while let Some(token_result) = stream.next().await {
                    match token_result {
                        Ok(token) => {
                            complete_content.push_str(&token);
                            
                            // Emit token to frontend
                            let _ = window.emit("chat_stream_token", ChatStreamToken {
                                conversation_id: conversation_id.clone(),
                                token: token.clone(),
                            });
                        }
                        Err(e) => {
                            eprintln!("Streaming error: {}", e);
                            if complete_content.is_empty() {
                                complete_content = format!("Streaming error: {}", e);
                            }
                            break;
                        }
                    }
                }
            }
        } else {
            // Use genai for other providers (currently commented out)
            // TODO: Implement genai-based streaming for other providers

            // match client.exec_chat_stream(&model, chat_req.clone(), None).await {
            //     Ok(chat_stream_response) => {
            //         // Extract the stream from the ChatStreamResponse
            //         use futures::StreamExt;
            //         let mut stream = chat_stream_response.stream;
                    
            //         while let Some(stream_result) = stream.next().await {
            //             match stream_result {
            //                 Ok(event) => {
            //                     use genai::chat::ChatStreamEvent;
            //                     match event {
            //                         ChatStreamEvent::Start => {
            //                             // Stream started
            //                             continue;
            //                         }
            //                         ChatStreamEvent::Chunk(chunk) => {
            //                             // Access content directly from the chunk struct
            //                             complete_content.push_str(&chunk.content);
                                        
            //                             // Emit token to frontend
            //                             let _ = window.emit("chat_stream_token", ChatStreamToken {
            //                                 conversation_id: conversation_id.clone(),
            //                                 token: chunk.content.clone(),
            //                             });
            //                         }
            //                         ChatStreamEvent::ReasoningChunk(reasoning_chunk) => {
            //                             // Handle reasoning content if needed
            //                             complete_content.push_str(&reasoning_chunk.content);
                                        
            //                             let _ = window.emit("chat_stream_token", ChatStreamToken {
            //                                 conversation_id: conversation_id.clone(),
            //                                 token: reasoning_chunk.content.clone(),
            //                             });
            //                         }
            //                         ChatStreamEvent::ToolCallChunk(_tool_chunk) => {
            //                             // Handle tool call chunks if needed
            //                             // For now we'll skip these as they're function calls, not text content
            //                             continue;
            //                         }
            //                         ChatStreamEvent::End(_stream_end) => {
            //                             // Emit stream end event to frontend
            //                             continue;
            //                         }
            //                     }
            //                 }
            //                 Err(e) => {
            //                     eprintln!("Stream error: {}", e);
            //                     break;
            //                 }
            //             }
            //         }
            //     }
            //     Err(e) => {
            //         eprintln!("Failed to start stream: {}", e);
            //         // Fallback to non-streaming
            //         match client.exec_chat(&model, chat_req.clone(), None).await {
            //             Ok(response) => {
            //                 complete_content = response.first_text().unwrap_or("No response").to_string();
                            
            //                 // Simulate streaming by sending words
            //                 let words: Vec<&str> = complete_content.split_whitespace().collect();
            //                 for word in words {
            //                     let _ = window.emit("chat_stream_token", ChatStreamToken {
            //                         conversation_id: conversation_id.clone(),
            //                         token: format!("{} ", word),
            //                     });
            //                     tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
            //                 }
            //             }
            //             Err(e2) => {
            //                 complete_content = format!("Error: {}", e2);
            //             }
            //         }
            //     }
            // }
        }
        
        // Persist the complete message to database
        if let Ok(conn) = get_conn(&app) {
            let _ = conn.execute(
                "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                params![message_id, conversation_id, "assistant", complete_content, created_at],
            );
        }

        // Emit stream end event
        let _ = window.emit("chat_stream_end", ChatStreamEnd {
            conversation_id: conversation_id.clone(),
            message_id: message_id.clone(),
            complete_content: complete_content.clone(),
        });

        // Handle conversation title generation (existing logic)
        if let Ok(conn) = get_conn(&app) {
            use rusqlite::OptionalExtension;
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM messages WHERE conversation_id = ?", params![&conversation_id], |row| row.get(0))
                .unwrap_or(0);
            if count >= 6 {
                let first_user: Option<String> = conn
                    .query_row(
                        "SELECT content FROM messages WHERE conversation_id = ? AND role = 'user' ORDER BY datetime(created_at) ASC LIMIT 1",
                        params![&conversation_id],
                        |row| row.get(0),
                    )
                    .optional()
                    .unwrap_or(None);

                if let Some(initial) = first_user {
                    let decide_prompt = format!(
                        "You are deciding whether to change a chat title based on topic drift. If the latest exchange shifts the topic materially beyond the initial message, reply with exactly: CHANGE: <New Title> (max 5 words). Otherwise reply with exactly: KEEP.\n\nInitial user message: {}\nLatest assistant reply: {}",
                        initial,
                        complete_content
                    );
                    
                    // Use genai for title generation regardless of the main model
                    use genai::Client;
                    use genai::chat::{ChatMessage, ChatRequest};
                    let title_client = Client::default();
                    let mut req = ChatRequest::default();
                    req = req.append_message(ChatMessage::user(&decide_prompt));
                    match title_client.exec_chat("gemini-1.5-flash", req, None).await {
                        Ok(decision_res) => {
                            let decision = decision_res.first_text().unwrap_or("").trim().to_string();
                            if decision.to_uppercase().starts_with("CHANGE:") {
                                let mut new_title = decision[7..].trim().to_string();
                                if new_title.is_empty() { new_title = "Conversation".to_string(); }
                                let _ = conn.execute("UPDATE conversations SET title = ? WHERE id = ?", params![new_title, &conversation_id]);
                            }
                        },
                        Err(_) => { /* skip retitle on failure */ }
                    }
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn list_chat_models(app: tauri::AppHandle) -> Result<Vec<ListedModel>, String> {
    let _ = dotenvy::dotenv();
    // Build from settings, not env, and only providers we support
    // Keep OpenAI, Anthropic, Gemini, OpenRouter, Groq; exclude Cohere/Mistral/Llama.cpp
    let settings = read_settings(&app).unwrap_or_default();
    let mut out = Vec::new();

    // OpenAI - enabled if API key is set and provider is enabled
    if settings.openai_enabled.unwrap_or(true) {
        let has_api_key = settings.openai_api_key.is_some() || settings.api_key.is_some();

        // Add manually configured models first
        if let Some(models) = settings.openai_models.clone() {
            for m in models {
                out.push(ListedModel {
                    model: m,
                    adapter_kind: "OpenAI".to_string(),
                    enabled: has_api_key,
                });
            }
        }

        // If no manual models configured, try to fetch from API if API key is available
        if settings.openai_models.is_none() && has_api_key {
            if let Ok(api_models) = get_adapter_models("OpenAI".to_string()).await {
                for m in api_models {
                    out.push(ListedModel {
                        model: m,
                        adapter_kind: "OpenAI".to_string(),
                        enabled: has_api_key,
                    });
                }
            } else {
                // Fallback to default models if API fetch fails
                let default_models = vec!["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
                for model in default_models {
                    out.push(ListedModel {
                        model: model.to_string(),
                        adapter_kind: "OpenAI".to_string(),
                        enabled: has_api_key,
                    });
                }
            }
        } else if settings.openai_models.is_none() {
            // No API key, show popular default models
            let default_models = vec!["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
            for model in default_models {
                out.push(ListedModel {
                    model: model.to_string(),
                    adapter_kind: "OpenAI".to_string(),
                    enabled: has_api_key,
                });
            }
        }
    }

    // Anthropic - enabled if API key is set and provider is enabled
    if settings.anthropic_enabled.unwrap_or(true) {
        let has_api_key = settings.anthropic_api_key.is_some();

        // Add manually configured models first
        if let Some(models) = settings.anthropic_models.clone() {
            for m in models {
                out.push(ListedModel {
                    model: m,
                    adapter_kind: "Anthropic".to_string(),
                    enabled: has_api_key,
                });
            }
        }

        // If no manual models configured, try to fetch from API if API key is available
        if settings.anthropic_models.is_none() && has_api_key {
            if let Ok(api_models) = get_adapter_models("Anthropic".to_string()).await {
                for m in api_models {
                    out.push(ListedModel {
                        model: m,
                        adapter_kind: "Anthropic".to_string(),
                        enabled: has_api_key,
                    });
                }
            } else {
                // Fallback to default models if API fetch fails
                let default_models = vec![
                    "claude-3-5-sonnet-20241022", 
                    "claude-3-5-haiku-20241022", 
                    "claude-3-opus-20240229",
                    "claude-3-sonnet-20240229",
                    "claude-3-haiku-20240307"
                ];
                for model in default_models {
                    out.push(ListedModel {
                        model: model.to_string(),
                        adapter_kind: "Anthropic".to_string(),
                        enabled: has_api_key,
                    });
                }
            }
        } else if settings.anthropic_models.is_none() {
            // No API key, show popular default models
            let default_models = vec![
                "claude-3-5-sonnet-20241022", 
                "claude-3-5-haiku-20241022", 
                "claude-3-opus-20240229",
                "claude-3-sonnet-20240229",
                "claude-3-haiku-20240307"
            ];
            for model in default_models {
                out.push(ListedModel {
                    model: model.to_string(),
                    adapter_kind: "Anthropic".to_string(),
                    enabled: has_api_key,
                });
            }
        }
    }

    // Gemini - enabled if API key is set and provider is enabled
    if settings.gemini_enabled.unwrap_or(true) {
        let has_api_key = settings.gemini_api_key.is_some();

        // Add manually configured models first
        if let Some(models) = settings.gemini_models.clone() {
            for m in models {
                out.push(ListedModel {
                    model: m,
                    adapter_kind: "Gemini".to_string(),
                    enabled: has_api_key,
                });
            }
        }

        // If no manual models configured, try to fetch from API if API key is available
        if settings.gemini_models.is_none() && has_api_key {
            if let Ok(api_models) = get_adapter_models("Gemini".to_string()).await {
                for m in api_models {
                    out.push(ListedModel {
                        model: m,
                        adapter_kind: "Gemini".to_string(),
                        enabled: has_api_key,
                    });
                }
            } else {
                // Fallback to default models if API fetch fails
                let default_models = vec![
                    "gemini-1.5-pro-latest",
                    "gemini-1.5-flash-latest", 
                    "gemini-1.5-flash-8b-latest",
                    "gemini-2.0-flash-exp"
                ];
                for model in default_models {
                    out.push(ListedModel {
                        model: model.to_string(),
                        adapter_kind: "Gemini".to_string(),
                        enabled: has_api_key,
                    });
                }
            }
        } else if settings.gemini_models.is_none() {
            // No API key, show popular default models
            let default_models = vec![
                "gemini-1.5-pro-latest",
                "gemini-1.5-flash-latest", 
                "gemini-1.5-flash-8b-latest",
                "gemini-2.0-flash-exp"
            ];
            for model in default_models {
                out.push(ListedModel {
                    model: model.to_string(),
                    adapter_kind: "Gemini".to_string(),
                    enabled: has_api_key,
                });
            }
        }
    }

    // Groq - enabled if API key is set and provider is enabled
    if settings.groq_enabled.unwrap_or(true) {
        let has_api_key = settings.groq_api_key.is_some();

        // Add manually configured models first
        if let Some(models) = settings.groq_models.clone() {
            for m in models {
                out.push(ListedModel {
                    model: m,
                    adapter_kind: "Groq".to_string(),
                    enabled: has_api_key,
                });
            }
        }

        // If no manual models configured, try to fetch from API if API key is available
        if settings.groq_models.is_none() && has_api_key {
            if let Ok(api_models) = get_adapter_models("Groq".to_string()).await {
                for m in api_models {
                    out.push(ListedModel {
                        model: m,
                        adapter_kind: "Groq".to_string(),
                        enabled: has_api_key,
                    });
                }
            } else {
                // Fallback to default models if API fetch fails
                let default_models = vec![
                    "llama-3.1-70b-versatile",
                    "llama-3.1-8b-instant", 
                    "mixtral-8x7b-32768",
                    "gemma2-9b-it"
                ];
                for model in default_models {
                    out.push(ListedModel {
                        model: model.to_string(),
                        adapter_kind: "Groq".to_string(),
                        enabled: has_api_key,
                    });
                }
            }
        } else if settings.groq_models.is_none() {
            // No API key, show popular default models
            let default_models = vec![
                "llama-3.1-70b-versatile",
                "llama-3.1-8b-instant", 
                "mixtral-8x7b-32768",
                "gemma2-9b-it"
            ];
            for model in default_models {
                out.push(ListedModel {
                    model: model.to_string(),
                    adapter_kind: "Groq".to_string(),
                    enabled: has_api_key,
                });
            }
        }
    }

    // OpenRouter - enabled if API key is set and provider is enabled
    if settings.openrouter_enabled.unwrap_or(true) {
        let has_api_key = settings.openrouter_api_key.is_some();

        // Add manually configured models first
        if let Some(models) = settings.openrouter_models.clone() {
            for m in models {
                out.push(ListedModel {
                    model: m,
                    adapter_kind: "OpenRouter".to_string(),
                    enabled: has_api_key,
                });
            }
        }

        // If no manual models configured, try to fetch from API if API key is available
        if settings.openrouter_models.is_none() && has_api_key {
            if let Ok(api_models) = get_adapter_models("OpenRouter".to_string()).await {
                for m in api_models {
                    out.push(ListedModel {
                        model: m,
                        adapter_kind: "OpenRouter".to_string(),
                        enabled: has_api_key,
                    });
                }
            } else {
                // Fallback to default models if API fetch fails
                let default_models = vec![
                    "anthropic/claude-3.5-sonnet",
                    "openai/gpt-4o", 
                    "google/gemini-pro-1.5",
                    "meta-llama/llama-3.1-70b-instruct",
                    "openrouter/auto"
                ];
                for model in default_models {
                    out.push(ListedModel {
                        model: model.to_string(),
                        adapter_kind: "OpenRouter".to_string(),
                        enabled: has_api_key,
                    });
                }
            }
        } else if settings.openrouter_models.is_none() {
            // No API key, show popular default models
            let default_models = vec![
                "anthropic/claude-3.5-sonnet",
                "openai/gpt-4o", 
                "google/gemini-pro-1.5",
                "meta-llama/llama-3.1-70b-instruct",
                "openrouter/auto"
            ];
            for model in default_models {
                out.push(ListedModel {
                    model: model.to_string(),
                    adapter_kind: "OpenRouter".to_string(),
                    enabled: has_api_key,
                });
            }
        }
    }

    // Mistral - show popular models (no built-in settings support yet)
    let default_mistral_models = vec![
        "mistral-large-latest",
        "mistral-medium-latest", 
        "mistral-small-latest",
        "codestral-latest"
    ];
    for model in default_mistral_models {
        out.push(ListedModel {
            model: model.to_string(),
            adapter_kind: "Mistral".to_string(),
            enabled: false, // No API key support in settings yet
        });
    }

    // Ollama - show popular models (local models, so enabled by default)
    let default_ollama_models = vec![
        "llama3.2:3b",
        "llama3.1:8b", 
        "llama3.1:70b",
        "qwen2.5:7b",
        "codellama:7b"
    ];
    for model in default_ollama_models {
        out.push(ListedModel {
            model: model.to_string(),
            adapter_kind: "Ollama".to_string(),
            enabled: true, // Ollama runs locally, no API key needed
        });
    }

    // Grok (X.AI) - show popular models (no built-in settings support yet)
    let default_xai_models = vec![
        "grok-beta",
        "grok-vision-beta"
    ];
    for model in default_xai_models {
        out.push(ListedModel {
            model: model.to_string(),
            adapter_kind: "X.AI".to_string(),
            enabled: false, // No API key support in settings yet
        });
    }

    // Debug: log the models being returned
    println!("Returning {} models:", out.len());
    for model in &out {
        println!("  {} ({}) - enabled: {}", model.model, model.adapter_kind, model.enabled);
    }
    
    Ok(out)
}

#[tauri::command]
pub async fn get_adapter_models(adapter_kind: String) -> Result<Vec<String>, String> {
    let _ = dotenvy::dotenv();

    use genai::Client;
    use genai::adapter::AdapterKind;

    let client = Client::default();

    let kind = match adapter_kind.as_str() {
        "OpenAI" => AdapterKind::OpenAI,
        "Anthropic" => AdapterKind::Anthropic,
        "Gemini" => AdapterKind::Gemini,
        "Groq" => AdapterKind::Groq,
        "Ollama" => AdapterKind::Ollama,
        "Cohere" => AdapterKind::Cohere,
        _ => return Err(format!("Unsupported adapter kind: {}", adapter_kind)),
    };

    match client.all_model_names(kind).await {
        Ok(models) => Ok(models),
        Err(e) => Err(format!("Failed to fetch models for {}: {}", adapter_kind, e)),
    }
}