use serde::{Deserialize, Serialize};
use reqwest::Client;
use futures::Stream;
use std::pin::Pin;
use bytes::Bytes;

#[derive(Debug, Serialize)]
pub struct OpenAIMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct OpenAIRequest {
    pub model: String,
    pub messages: Vec<OpenAIMessage>,
    pub stream: bool,
    pub temperature: f32,
    pub max_tokens: u32,
}

#[derive(Debug, Deserialize)]
pub struct OpenAIResponse {
    pub choices: Option<Vec<OpenAIChoice>>,
    pub error: Option<OpenAIError>,
}

#[derive(Debug, Deserialize)]
pub struct OpenAIChoice {
    pub delta: Option<OpenAIDelta>,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OpenAIDelta {
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OpenAIError {
    pub message: String,
    #[serde(rename = "type")]
    pub error_type: Option<String>,
}

pub struct OpenAIProvider {
    client: Client,
    api_key: String,
}

impl OpenAIProvider {
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
        let request = OpenAIRequest {
            model: model.to_string(),
            messages: vec![OpenAIMessage {
                role: "user".to_string(),
                content: user_message.to_string(),
            }],
            stream: true,
            temperature: 0.7,
            max_tokens: 4096,
        };

        // Make the streaming request
        let response = self
            .client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("OpenAI API error: {}", error_text).into());
        }

        // Get the response stream
        let stream = response.bytes_stream();
        
        // Process the stream
        use futures::StreamExt;
        let processed_stream = stream.map(move |chunk_result| {
            match chunk_result {
                Ok(chunk) => parse_openai_chunk(chunk),
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

fn parse_openai_chunk(chunk: Bytes) -> Result<Option<String>, Box<dyn std::error::Error + Send + Sync>> {
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
            match serde_json::from_str::<OpenAIResponse>(json_data) {
                Ok(response) => {
                    if let Some(error) = response.error {
                        return Err(format!("OpenAI API error: {}", error.message).into());
                    }
                    
                    if let Some(choices) = response.choices {
                        for choice in choices {
                            if let Some(delta) = choice.delta {
                                if let Some(content) = delta.content {
                                    if !content.is_empty() {
                                        return Ok(Some(content));
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    // Log parsing errors but continue processing
                    eprintln!("Failed to parse OpenAI chunk: {} - Data: {}", e, json_data);
                }
            }
        }
    }
    
    Ok(None)
}
