use std::pin::Pin;
use std::task::{Context, Poll};
use std::sync::{Arc, Mutex};
use futures::{Stream, StreamExt};
use ollama_rs::{
    Ollama,
    generation::chat::{ChatMessage, ChatMessageRequest, ChatMessageResponseStream},
};
use tokio_stream::wrappers::ReceiverStream;
use tokio::sync::mpsc;

pub struct OllamaProvider {
    client: Ollama,
}

impl OllamaProvider {
    pub fn new() -> Self {
        Self {
            client: Ollama::default(),
        }
    }

    pub async fn stream_chat(
        &self,
        model: &str,
        user_message: &str,
    ) -> Result<impl Stream<Item = Result<String, String>>, String> {
        // Create a channel for streaming tokens
        let (tx, rx) = mpsc::channel::<Result<String, String>>(100);
        
        let client = self.client.clone();
        let model = model.to_string();
        let user_message = user_message.to_string();
        
        // Spawn the chat task
        tokio::spawn(async move {
            let history = Arc::new(Mutex::new(vec![]));
            
            let chat_request = ChatMessageRequest::new(
                model.clone(),
                vec![ChatMessage::user(user_message.clone())],
            );

            match client
                .send_chat_messages_with_history_stream(history.clone(), chat_request)
                .await
            {
                Ok(mut stream) => {
                    while let Some(response) = stream.next().await {
                        match response {
                            Ok(chat_response) => {
                                // Send the content as a token
                                if let Err(_) = tx.send(Ok(chat_response.message.content)).await {
                                    break; // Receiver was dropped
                                }
                            }
                            Err(e) => {
                                let _ = tx.send(Err(format!("Ollama error: {}", e))).await;
                                break;
                            }
                        }
                    }
                }
                Err(e) => {
                    let error_msg = if e.to_string().contains("connection") || e.to_string().contains("Connection refused") {
                        "Ollama is not running. Please start Ollama first.".to_string()
                    } else {
                        format!("Failed to start Ollama stream: {}", e)
                    };
                    let _ = tx.send(Err(error_msg)).await;
                }
            }
        });

        // Return a stream that reads from the channel
        Ok(ReceiverStream::new(rx))
    }

    pub async fn list_models(&self) -> Result<Vec<String>, String> {
        match self.client.list_local_models().await {
            Ok(models) => {
                let model_names: Vec<String> = models
                    .into_iter()
                    .map(|model| model.name)
                    .collect();
                Ok(model_names)
            }
            Err(e) => {
                // Check if it's a connection error (Ollama not running)
                if e.to_string().contains("connection") || e.to_string().contains("Connection refused") {
                    Err("Ollama is not running. Please start Ollama first.".to_string())
                } else {
                    Err(format!("Failed to list Ollama models: {}", e))
                }
            }
        }
    }
}

impl Clone for OllamaProvider {
    fn clone(&self) -> Self {
        Self {
            client: self.client.clone(),
        }
    }
}