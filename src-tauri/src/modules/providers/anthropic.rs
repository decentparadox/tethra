use serde::{Deserialize, Serialize};
use reqwest::Client;
use futures::Stream;
use std::pin::Pin;
use bytes::Bytes;

#[derive(Debug, Serialize)]
pub struct AnthropicMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct AnthropicRequest {
    pub model: String,
    pub max_tokens: u32,
    pub temperature: f32,
    pub messages: Vec<AnthropicMessage>,
    pub stream: bool,
}

#[derive(Debug, Deserialize)]
pub struct AnthropicResponse {
    #[serde(rename = "type")]
    pub response_type: String,
    pub delta: Option<AnthropicDelta>,
    pub content_block: Option<AnthropicContentBlock>,
    pub error: Option<AnthropicError>,
}

#[derive(Debug, Deserialize)]
pub struct AnthropicDelta {
    pub text: Option<String>,
    #[serde(rename = "type")]
    pub delta_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AnthropicContentBlock {
    pub text: Option<String>,
    #[serde(rename = "type")]
    pub block_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AnthropicError {
    pub message: String,
    #[serde(rename = "type")]
    pub error_type: Option<String>,
}

pub struct AnthropicProvider {
    client: Client,
    api_key: String,
}

impl AnthropicProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }

    pub async fn stream_chat(
        &self,
        model: &str,
        user_message: &str,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String, Box<dyn std::error::Error + Send + Sync>>> + Send>>, Box<dyn std::error::Error + Send + Sync>> {
        // Prepare the request payload
        let request = AnthropicRequest {
            model: model.to_string(),
            max_tokens: 4096,
            temperature: 0.7,
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: user_message.to_string(),
            }],
            stream: true,
        };

        // Make the streaming request
        let response = self
            .client
            .post("https://api.anthropic.com/v1/messages")
            .header("Content-Type", "application/json")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Anthropic API error: {}", error_text).into());
        }

        // Get the response stream
        let stream = response.bytes_stream();
        
        // Process the stream
        use futures::StreamExt;
        let processed_stream = stream.map(move |chunk_result| {
            match chunk_result {
                Ok(chunk) => parse_anthropic_chunk(chunk),
                Err(e) => Err(e.into()),
            }
        }).filter_map(|result| async move {
            match result {
                Ok(Some(text)) => Some(Ok(text)),
                Ok(None) => None, // Skip empty chunks
                Err(e) => Some(Err(e)),
            }
        });

        Ok(Box::pin(processed_stream))
    }
}

fn parse_anthropic_chunk(chunk: Bytes) -> Result<Option<String>, Box<dyn std::error::Error + Send + Sync>> {
    let chunk_str = std::str::from_utf8(&chunk)?;
    
    // Split by lines and process each line
    for line in chunk_str.lines() {
        let line = line.trim();
        
        // Skip empty lines and comments
        if line.is_empty() || line.starts_with(':') {
            continue;
        }
        
        // Handle SSE data lines
        if line.starts_with("data: ") {
            let json_data = &line[6..]; // Remove "data: " prefix
            
            // Skip [DONE] markers
            if json_data == "[DONE]" {
                continue;
            }
            
            // Parse the JSON
            match serde_json::from_str::<AnthropicResponse>(json_data) {
                Ok(response) => {
                    if let Some(error) = response.error {
                        return Err(format!("Anthropic API error: {}", error.message).into());
                    }
                    
                    // Handle different event types
                    match response.response_type.as_str() {
                        "content_block_delta" => {
                            if let Some(delta) = response.delta {
                                if let Some(text) = delta.text {
                                    if !text.is_empty() {
                                        return Ok(Some(text));
                                    }
                                }
                            }
                        }
                        "content_block_start" => {
                            if let Some(content_block) = response.content_block {
                                if let Some(text) = content_block.text {
                                    if !text.is_empty() {
                                        return Ok(Some(text));
                                    }
                                }
                            }
                        }
                        _ => {
                            // Other event types (message_start, message_delta, etc.)
                            continue;
                        }
                    }
                }
                Err(e) => {
                    // Log parsing errors but continue processing
                    eprintln!("Failed to parse Anthropic chunk: {} - Data: {}", e, json_data);
                }
            }
        }
    }
    
    Ok(None)
}
