# Ollama Integration

This application now includes proper Ollama integration using the `ollama-rs` crate.

## Features

- **Local Model Support**: Connect to locally running Ollama instances
- **Streaming Chat**: Real-time streaming responses from Ollama models
- **Model Discovery**: Automatically list available local models
- **No API Keys Required**: Ollama runs locally, so no API keys are needed

## Setup

1. **Install Ollama**: Follow the instructions at [ollama.ai](https://ollama.ai) to install Ollama on your system.

2. **Start Ollama**: Run `ollama serve` to start the Ollama server.

3. **Pull Models**: Pull the models you want to use:
   ```bash
   ollama pull llama3.2:3b
   ollama pull qwen2.5:7b
   ollama pull codellama:7b
   ```

## Usage

Once Ollama is running, the application will automatically detect and list available models. You can select any Ollama model from the model selector and start chatting.

## Supported Models

The application includes default suggestions for popular Ollama models:
- `llama3.2:3b`
- `llama3.1:8b`
- `llama3.1:70b`
- `qwen2.5:7b`
- `codellama:7b`

## Implementation Details

### Backend (Rust)

The Ollama integration is implemented in `src-tauri/src/modules/providers/ollama.rs`:

- **OllamaProvider**: Main provider class that handles communication with Ollama
- **Streaming Support**: Uses `ollama-rs` with streaming features for real-time responses
- **Error Handling**: Graceful handling of connection errors when Ollama is not running
- **Model Discovery**: Automatic listing of available local models

### Frontend (TypeScript/React)

The frontend includes:
- **Model Icon**: Custom Ollama icon in `src/components/icons/ollama.tsx`
- **Model Detection**: Automatic detection of Ollama models in the model selector
- **UI Integration**: Seamless integration with the existing chat interface

## Troubleshooting

### Ollama Not Running
If you see an error "Ollama is not running", make sure:
1. Ollama is installed on your system
2. The Ollama server is running (`ollama serve`)
3. You can access Ollama at `http://localhost:11434`

### Model Not Found
If a model is not available:
1. Pull the model: `ollama pull <model-name>`
2. Check available models: `ollama list`
3. Restart the application to refresh the model list

### Connection Issues
If you're having connection issues:
1. Check if Ollama is running on the default port (11434)
2. Verify firewall settings
3. Try restarting the Ollama server

## Dependencies

The integration uses:
- `ollama-rs = "0.3.2"` - Rust client for Ollama API
- `tokio-stream = "0.1.17"` - For async streaming support

## Future Enhancements

Potential improvements:
- Model management (create, delete, copy models)
- Custom model options (temperature, top_p, etc.)
- Model file support
- Remote Ollama server support
- Model performance metrics