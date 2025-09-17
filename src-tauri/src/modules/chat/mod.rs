use serde::{Deserialize, Serialize};
use tauri::{Manager, Emitter};
use chrono::Utc;
use rusqlite::params;
use crate::modules::settings::{read_settings, setup_provider_env_for_model};
use crate::modules::database::get_conn;
use crate::modules::utils::uuid;
use crate::modules::providers::{GeminiProvider, OpenAIProvider, AnthropicProvider, OpenRouterProvider, OllamaProvider};

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

fn is_openrouter_model(model: &str) -> bool {
    // OpenRouter models typically have format "provider/model" or "openrouter/auto"
    // Check for common OpenRouter patterns
    model.contains("openrouter") ||
    model.contains("anthropic/") ||
    model.contains("openai/") ||
    model.contains("google/") ||
    model.contains("meta-llama/") ||
    model.contains("mistral/") ||
    model.contains("cohere/") ||
    // Add more provider prefixes as needed
    (model.contains("/") && !model.contains(":")) // General provider/model format, excluding Ollama's model:tag format
}

#[tauri::command]
pub async fn stream_chat(app: tauri::AppHandle, input: StreamChatInput) -> Result<(), String> {
    let _ = dotenvy::dotenv();

    // Log the received input for debugging
    println!("stream_chat called with conversation_id: {}, user_message: {}", input.conversation_id, input.user_message);
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
    
    // Update the conversation with the model being used (for persistence)
    if let Err(e) = crate::modules::database::db_update_conversation_model(app.clone(), conversation_id.clone(), model.clone()).await {
        eprintln!("Warning: Failed to update conversation model: {}", e);
    }

    let window = app.get_webview_window("main").ok_or_else(|| "no main window".to_string())?;

    tauri::async_runtime::spawn(async move {
        // Generate message ID for user message
        let user_message_id = uuid();
        let created_at = Utc::now().to_rfc3339();

        // Save user message to database as full AI SDK message structure
        let user_message_json = serde_json::json!({
            "id": user_message_id,
            "role": "user",
            "parts": [
                {
                    "type": "text",
                    "text": user_text
                }
            ]
        });
        if let Ok(conn) = get_conn(&app) {
            match conn.execute(
                "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                params![user_message_id, conversation_id, "user", user_message_json.to_string(), created_at],
            ) {
                Ok(_) => println!("Successfully saved user message to database"),
                Err(e) => eprintln!("Failed to save user message to database: {}", e),
            }
        } else {
            eprintln!("Failed to get database connection for user message");
        }

        // Generate message ID for AI response
        let message_id = uuid();

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
                                  is_openrouter_model(&model) ||
                                  model.starts_with("o1-") ||
                                  model.contains(":") || // Ollama models typically have format like "llama3.2:3b"
                                  model.starts_with("llama") ||
                                  model.starts_with("qwen") ||
                                  model.starts_with("codellama");

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
            } else if is_openrouter_model(&model) {
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
            } else if model.starts_with("deepseek-") || model.starts_with("deepseek/") {
                // DeepSeek provider - use OpenAI-compatible API
                // This will be handled by the frontend DeepSeek provider
                complete_content = "DeepSeek models should be handled by the frontend provider.".to_string();
                None
            } else if model.contains(":") || model.starts_with("llama") || model.starts_with("qwen") || model.starts_with("codellama") {
                // Ollama provider - no API key needed as it runs locally
                let provider = OllamaProvider::new();
                match provider.stream_chat(&model, &user_text).await {
                    Ok(stream) => Some(stream),
                    Err(e) => {
                        eprintln!("Failed to start Ollama stream: {}", e);
                        complete_content = format!("Failed to start Ollama stream: {}", e);
                        None
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
                                token: token.to_string(),
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
        
        // Persist the complete message to database as full AI SDK message structure
        let ai_message_json = serde_json::json!({
            "id": message_id,
            "role": "assistant",
            "parts": [
                {
                    "type": "step-start"
                },
                {
                    "type": "text",
                    "text": complete_content,
                    "state": "done"
                }
            ]
        });
        if let Ok(conn) = get_conn(&app) {
            match conn.execute(
                "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                params![message_id, conversation_id, "assistant", ai_message_json.to_string(), created_at],
            ) {
                Ok(_) => println!("Successfully saved assistant message to database"),
                Err(e) => eprintln!("Failed to save assistant message to database: {}", e),
            }
        } else {
            eprintln!("Failed to get database connection for assistant message");
        }

        // Emit stream end event
        let _ = window.emit("chat_stream_end", ChatStreamEnd {
            conversation_id: conversation_id.clone(),
            message_id: message_id.clone(),
            complete_content: complete_content.clone(),
        });

        // Handle conversation title generation - generate immediately after first response
        if let Ok(conn) = get_conn(&app) {
            let _count: i64 = conn
                .query_row("SELECT COUNT(*) FROM messages WHERE conversation_id = ?", params![&conversation_id], |row| row.get(0))
                .unwrap_or(0);

            // Check current title to see if it's still default
            let _current_title: String = conn
                .query_row("SELECT title FROM conversations WHERE id = ?", params![&conversation_id], |row| row.get(0))
                .unwrap_or_else(|_| "New Chat".to_string());
            
            // Title generation and retitling is now handled by the frontend using AI SDK
            // No backend genai title generation needed
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

    // OpenAI - enabled if API key is set
    let openai_has_api_key = settings.openai_api_key.is_some() || settings.api_key.is_some();

    if openai_has_api_key {
        // Add manually configured models first
        if let Some(models) = settings.openai_models.clone() {
            for m in models {
                out.push(ListedModel {
                    model: m,
                    adapter_kind: "OpenAI".to_string(),
                    enabled: true,
                });
            }
        }

        // If no manual models configured, use default models
        if settings.openai_models.is_none() {
            // Show popular default models
            let default_models = vec!["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
            for model in default_models {
                out.push(ListedModel {
                    model: model.to_string(),
                    adapter_kind: "OpenAI".to_string(),
                    enabled: true,
                });
            }
        }
    }

    // Anthropic - enabled if API key is set
    let anthropic_has_api_key = settings.anthropic_api_key.is_some();

    if anthropic_has_api_key {
        // Add manually configured models first
        if let Some(models) = settings.anthropic_models.clone() {
            for m in models {
                out.push(ListedModel {
                    model: m,
                    adapter_kind: "Anthropic".to_string(),
                    enabled: true,
                });
            }
        }

        // If no manual models configured, use default models
        if settings.anthropic_models.is_none() {
            // Show popular default models
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
                    enabled: true,
                });
            }
        }
    }

    // Gemini - enabled if API key is set
    let gemini_has_api_key = settings.gemini_api_key.is_some();

    if gemini_has_api_key {
        // Add manually configured models first
        if let Some(models) = settings.gemini_models.clone() {
            for m in models {
                out.push(ListedModel {
                    model: m,
                    adapter_kind: "Gemini".to_string(),
                    enabled: true,
                });
            }
        }

        // If no manual models configured, use default models
        if settings.gemini_models.is_none() {
            // Show popular default models
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
                    enabled: true,
                });
            }
        }
    }

    // Groq - enabled if API key is set
    let groq_has_api_key = settings.groq_api_key.is_some();

    if groq_has_api_key {
        // Add manually configured models first
        if let Some(models) = settings.groq_models.clone() {
            for m in models {
                out.push(ListedModel {
                    model: m,
                    adapter_kind: "Groq".to_string(),
                    enabled: true,
                });
            }
        }

        // If no manual models configured, use default models
        if settings.groq_models.is_none() {
            // Show popular default models
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
                    enabled: true,
                });
            }
        }
    }

    // OpenRouter - enabled if API key is set
    let openrouter_has_api_key = settings.openrouter_api_key.is_some();

    if openrouter_has_api_key {

        // Add manually configured models first
        if let Some(models) = settings.openrouter_models.clone() {
            for m in models {
                out.push(ListedModel {
                    model: m,
                    adapter_kind: "OpenRouter".to_string(),
                    enabled: true,
                });
            }
        }

        // If no manual models configured, try to fetch from API if API key is available
        if settings.openrouter_models.is_none() && openrouter_has_api_key {
            if let Ok(api_models) = get_adapter_models("OpenRouter".to_string()).await {
                for m in api_models {
                    out.push(ListedModel {
                        model: m,
                        adapter_kind: "OpenRouter".to_string(),
                        enabled: true,
                    });
                }
            } else {
                // Fallback to default models if API fetch fails
                let default_models = vec![
                    "anthropic/claude-3.5-sonnet",
                    "openai/gpt-4o",
                    "google/gemini-pro-1.5",
                    "meta-llama/llama-3.2-90b-instruct",
                    "mistralai/mistral-large",
                ];
                for model in default_models {
                    out.push(ListedModel {
                        model: model.to_string(),
                        adapter_kind: "OpenRouter".to_string(),
                        enabled: true,
                    });
                }
            }
        } else if settings.openrouter_models.is_none() {
            // Show popular default models
            let default_models = vec![
                "anthropic/claude-3.5-sonnet",
                "openai/gpt-4o",
                "google/gemini-pro-1.5",
                "meta-llama/llama-3.2-90b-instruct",
                "mistralai/mistral-large",
            ];
            for model in default_models {
                out.push(ListedModel {
                    model: model.to_string(),
                    adapter_kind: "OpenRouter".to_string(),
                    enabled: true,
                });
            }
        }
    }

    // DeepSeek - enabled if API key is set
    let deepseek_has_api_key = settings.deepseek_api_key.is_some();

    if deepseek_has_api_key {
        // Add manually configured models first
        if let Some(models) = settings.deepseek_models.clone() {
            for m in models {
                out.push(ListedModel {
                    model: m,
                    adapter_kind: "DeepSeek".to_string(),
                    enabled: true,
                });
            }
        }

        // If no manual models configured, use default models
        if settings.deepseek_models.is_none() {
            // Show popular default models
            let default_models = vec![
                "deepseek-chat",
                "deepseek-coder",
                "deepseek-reasoner",
                "deepseek-chat-67b",
                "deepseek-coder-33b"
            ];
            for model in default_models {
                out.push(ListedModel {
                    model: model.to_string(),
                    adapter_kind: "DeepSeek".to_string(),
                    enabled: true,
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

    // Ollama - try to fetch actual local models, fallback to defaults if Ollama is not running
    let ollama_provider = OllamaProvider::new();
    match ollama_provider.list_models().await {
        Ok(local_models) => {
            // Use actual local models
            for model in local_models {
                out.push(ListedModel {
                    model: model,
                    adapter_kind: "Ollama".to_string(),
                    enabled: true, // Ollama runs locally, no API key needed
                });
            }
        }
        Err(e) => {
            println!("Failed to fetch Ollama models ({}), using defaults", e);
            // Fallback to default popular models if Ollama is not running
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
                    enabled: false, // Mark as disabled since Ollama is not running
                });
            }
        }
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

    match adapter_kind.as_str() {
        "Ollama" => {
            // Use our custom OllamaProvider for better integration
            let provider = OllamaProvider::new();
            provider.list_models().await
        }
        "OpenRouter" => {
            // Use openrouter-rs for OpenRouter model fetching
            let api_key = std::env::var("OPENROUTER_API_KEY")
                .map_err(|_| "OpenRouter API key not found. Please set OPENROUTER_API_KEY environment variable.".to_string())?;
            
            if api_key.is_empty() {
                return Err("OpenRouter API key is empty. Please provide a valid API key.".to_string());
            }
            
            use openrouter_rs::OpenRouterClient;
            
            let client = OpenRouterClient::builder()
                .api_key(&api_key)
                .http_referer("https://tethra.com")
                .x_title("Tethra AI Chat")
                .build()
                .map_err(|e| format!("Failed to create OpenRouter client: {}", e))?;
            
            match client.list_models().await {
                Ok(models) => {
                    let model_ids: Vec<String> = models.into_iter()
                        .map(|model| model.id)
                        .collect();
                    Ok(model_ids)
                },
                Err(e) => Err(format!("Failed to fetch OpenRouter models: {}", e)),
            }
        }
        _ => {
            // Use genai for other providers
            use genai::Client;
            use genai::adapter::AdapterKind;

            let client = Client::default();

            let kind = match adapter_kind.as_str() {
                "OpenAI" => AdapterKind::OpenAI,
                "Anthropic" => AdapterKind::Anthropic,
                "Gemini" => AdapterKind::Gemini,
                "Groq" => AdapterKind::Groq,
                "Cohere" => AdapterKind::Cohere,
                _ => return Err(format!("Unsupported adapter kind: {}", adapter_kind)),
            };

            match client.all_model_names(kind).await {
                Ok(models) => Ok(models),
                Err(e) => Err(format!("Failed to fetch models for {}: {}", adapter_kind, e)),
            }
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct OllamaChatInput {
    pub model: String,
    pub messages: Vec<serde_json::Value>,
}

#[tauri::command]
pub async fn stream_ollama_chat(
    _app: tauri::AppHandle,
    input: OllamaChatInput
) -> Result<Vec<String>, String> {
    // Extract the user message from the messages array
    let user_message = input.messages
        .iter()
        .find(|msg| msg["role"] == "user")
        .and_then(|msg| msg["content"].as_str())
        .unwrap_or("Hello");

    // Use the Ollama provider directly
    let provider = OllamaProvider::new();
    match provider.stream_chat(&input.model, user_message).await {
        Ok(mut stream) => {
            use futures::StreamExt;
            let mut tokens = Vec::new();

            while let Some(token_result) = stream.next().await {
                match token_result {
                    Ok(token) => {
                        tokens.push(token);
                    }
                    Err(e) => {
                        return Err(format!("Stream error: {}", e));
                    }
                }
            }

            Ok(tokens)
        }
        Err(e) => Err(format!("Failed to start Ollama stream: {}", e))
    }
}

#[tauri::command]
pub async fn get_ollama_model_info(model_name: String) -> Result<String, String> {
    let provider = OllamaProvider::new();
    provider.get_model_info(&model_name).await
}