use serde::{Deserialize, Serialize};
use reqwest::Client;
use futures::Stream;
use std::pin::Pin;
use bytes::Bytes;

#[derive(Debug, Serialize)]
pub struct GeminiMessage {
    pub role: String,
    pub parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize)]
pub struct GeminiPart {
    pub text: String,
}

#[derive(Debug, Serialize)]
pub struct GeminiRequest {
    pub contents: Vec<GeminiMessage>,
    #[serde(rename = "generationConfig")]
    pub generation_config: GeminiGenerationConfig,
}

#[derive(Debug, Serialize)]
pub struct GeminiGenerationConfig {
    pub temperature: f32,
    #[serde(rename = "maxOutputTokens")]
    pub max_output_tokens: u32,
}

#[derive(Debug, Deserialize)]
pub struct GeminiResponse {
    pub candidates: Option<Vec<GeminiCandidate>>,
    pub error: Option<GeminiError>,
}

#[derive(Debug, Deserialize)]
pub struct GeminiCandidate {
    pub content: Option<GeminiContent>,
    #[serde(rename = "finishReason")]
    pub finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GeminiContent {
    pub parts: Option<Vec<GeminiResponsePart>>,
}

#[derive(Debug, Deserialize)]
pub struct GeminiResponsePart {
    pub text: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GeminiError {
    pub code: i32,
    pub message: String,
}

pub struct GeminiProvider {
    client: Client,
    api_key: String,
}

impl GeminiProvider {
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
        let request = GeminiRequest {
            contents: vec![GeminiMessage {
                role: "user".to_string(),
                parts: vec![GeminiPart {
                    text: user_message.to_string(),
                }],
            }],
            generation_config: GeminiGenerationConfig {
                temperature: 0.7,
                max_output_tokens: 8192,
            },
        };

        // Build the URL for streaming
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse&key={}",
            model, self.api_key
        );

        // Make the streaming request
        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Gemini API error: {}", error_text).into());
        }

        // Get the response stream
        let stream = response.bytes_stream();
        
        // Process the stream
        use futures::StreamExt;
        let processed_stream = stream.map(move |chunk_result| {
            match chunk_result {
                Ok(chunk) => parse_gemini_chunk(chunk),
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

fn parse_gemini_chunk(chunk: Bytes) -> Result<Option<String>, Box<dyn std::error::Error + Send + Sync>> {
    let chunk_str = std::str::from_utf8(&chunk)?;
    
    // Split by lines and process each line
    for line in chunk_str.lines() {
        let line = line.trim();
        
        // Skip empty lines and comments
        if line.is_empty() || line.starts_with(':') {
            continue;
        }
        
        // Handle SSE data lines
        if let Some(json_data) = line.strip_prefix("data: ") {
            // Remove "data: " prefix
            
            // Skip [DONE] markers
            if json_data == "[DONE]" {
                continue;
            }
            
            // Parse the JSON
            match serde_json::from_str::<GeminiResponse>(json_data) {
                Ok(response) => {
                    if let Some(error) = response.error {
                        return Err(format!("Gemini API error: {} (code: {})", error.message, error.code).into());
                    }
                    
                    if let Some(candidates) = response.candidates {
                        for candidate in candidates {
                            if let Some(content) = candidate.content {
                                if let Some(parts) = content.parts {
                                    for part in parts {
                                        if let Some(text) = part.text {
                                            if !text.is_empty() {
                                                return Ok(Some(text));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    // Log parsing errors but continue processing
                    eprintln!("Failed to parse Gemini chunk: {} - Data: {}", e, json_data);
                }
            }
        }
    }
    
    Ok(None)
}
