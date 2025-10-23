use futures::{Stream, StreamExt};
use ollama_rs::{
    generation::chat::{request::ChatMessageRequest, ChatMessage},
    Ollama,
};
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

pub struct OllamaProvider {
    client: Ollama,
}

impl Default for OllamaProvider {
    fn default() -> Self {
        Self::new()
    }
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
    ) -> Result<
        Pin<
            Box<dyn Stream<Item = Result<String, Box<dyn std::error::Error + Send + Sync>>> + Send>,
        >,
        Box<dyn std::error::Error + Send + Sync>,
    > {
        // Create a channel for streaming tokens
        let (tx, rx) =
            mpsc::channel::<Result<String, Box<dyn std::error::Error + Send + Sync>>>(100);

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
                                let error_msg = format!("Ollama error: {:?}", e);
                                let _ = tx
                                    .send(Err(Box::new(std::io::Error::other(error_msg))
                                        as Box<dyn std::error::Error + Send + Sync>))
                                    .await;
                                break;
                            }
                        }
                    }
                }
                Err(e) => {
                    let error_msg = if e.to_string().contains("connection")
                        || e.to_string().contains("Connection refused")
                    {
                        "Ollama is not running. Please start Ollama first.".to_string()
                    } else {
                        format!("Failed to start Ollama stream: {}", e)
                    };
                    let _ = tx
                        .send(Err(Box::new(std::io::Error::other(error_msg))
                            as Box<dyn std::error::Error + Send + Sync>))
                        .await;
                }
            }
        });

        // Return a stream that reads from the channel
        Ok(Box::pin(ReceiverStream::new(rx)))
    }

    pub async fn list_models(&self) -> Result<Vec<String>, String> {
        match self.client.list_local_models().await {
            Ok(models) => {
                if models.is_empty() {
                    return Err("No models found. Please pull some models first using 'ollama pull <model-name>'.".to_string());
                }

                let model_names: Vec<String> = models
                    .into_iter()
                    .map(|model| {
                        // Log model info for debugging
                        println!(
                            "Found Ollama model: {} (size: {} bytes, modified: {})",
                            model.name, model.size, model.modified_at
                        );
                        model.name
                    })
                    .collect();

                println!("Total Ollama models found: {}", model_names.len());
                Ok(model_names)
            }
            Err(e) => {
                // Check if it's a connection error (Ollama not running)
                let error_str = e.to_string();
                if error_str.contains("connection")
                    || error_str.contains("Connection refused")
                    || error_str.contains("ConnectError")
                    || error_str.contains("11434")
                {
                    Err(
                        "Ollama is not running. Please start Ollama with 'ollama serve' first."
                            .to_string(),
                    )
                } else {
                    Err(format!("Failed to list Ollama models: {}", e))
                }
            }
        }
    }

    /// Get detailed information about a specific model
    pub async fn get_model_info(&self, model_name: &str) -> Result<String, String> {
        match self.client.show_model_info(model_name.to_string()).await {
            Ok(info) => Ok(format!(
                "Model: {}\nParameters: {}\nTemplate: {}",
                model_name, info.parameters, info.template
            )),
            Err(e) => Err(format!("Failed to get model info: {}", e)),
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
