use serde::{Deserialize, Serialize};
use std::{fs, io::Write, path::PathBuf};
use tauri::Manager;

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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppearanceSettings {
    pub theme: Option<String>,     // "system" | "light" | "dark"
    pub font_size: Option<String>, // "small" | "medium" | "large"
    pub code_show_line_numbers: Option<bool>,
    pub code_theme: Option<String>, // highlight.js theme id, e.g. "github-dark"
    pub chat_width: Option<String>, // "compact" | "full"
    pub window_bg: Option<String>,  // hex or css color
    pub app_bg: Option<String>,     // hex or css color
    pub primary_color: Option<String>,
    pub accent_color: Option<String>,
    pub destructive_color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppSettings {
    pub api_key: Option<String>,
    pub api_url: Option<String>,
    pub data_dir: Option<String>,
    pub spell_check: Option<bool>,
    pub experimental: Option<bool>,
    pub huggingface_token: Option<String>,
    // Provider-specific API keys
    pub openai_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    pub gemini_api_key: Option<String>,
    pub groq_api_key: Option<String>,
    pub openrouter_api_key: Option<String>,
    pub deepseek_api_key: Option<String>,
    pub openai_base_url: Option<String>,
    pub anthropic_base_url: Option<String>,
    pub gemini_base_url: Option<String>,
    pub groq_base_url: Option<String>,
    pub openrouter_base_url: Option<String>,
    pub deepseek_base_url: Option<String>,
    pub openai_models: Option<Vec<String>>,
    pub anthropic_models: Option<Vec<String>>,
    pub gemini_models: Option<Vec<String>>,
    pub groq_models: Option<Vec<String>>,
    pub openrouter_models: Option<Vec<String>>,
    pub deepseek_models: Option<Vec<String>>,
    // Provider toggles
    pub openai_enabled: Option<bool>,
    pub anthropic_enabled: Option<bool>,
    pub gemini_enabled: Option<bool>,
    pub groq_enabled: Option<bool>,
    pub openrouter_enabled: Option<bool>,
    pub deepseek_enabled: Option<bool>,
    pub appearance: Option<AppearanceSettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsFileLegacy {
    pub api_key: String,
    pub api_url: Option<String>,
}

pub fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut dir = app.path().app_data_dir().unwrap();
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("failed to create app config dir: {e}"))?;
    }
    dir.push("settings.json");
    Ok(dir)
}

pub fn read_settings(app: &tauri::AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(app)?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let data = fs::read(&path).map_err(|e| format!("read settings failed: {e}"))?;
    // Try new format, fallback to legacy
    if let Ok(s) = serde_json::from_slice::<AppSettings>(&data) {
        return Ok(s);
    }
    if let Ok(legacy) = serde_json::from_slice::<SettingsFileLegacy>(&data) {
        return Ok(AppSettings {
            api_key: Some(legacy.api_key),
            api_url: legacy.api_url,
            ..Default::default()
        });
    }
    Ok(AppSettings::default())
}

pub fn write_settings(app: &tauri::AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create parent dir failed: {e}"))?;
    }
    let json = serde_json::to_vec_pretty(settings)
        .map_err(|e| format!("serialize settings failed: {e}"))?;
    let mut file =
        fs::File::create(&path).map_err(|e| format!("open settings file failed: {e}"))?;
    file.write_all(&json)
        .map_err(|e| format!("write settings file failed: {e}"))?;
    Ok(())
}

pub fn merge_settings(base: &mut AppSettings, update: AppSettings) {
    if update.api_key.is_some() {
        base.api_key = update.api_key;
    }
    if update.api_url.is_some() {
        base.api_url = update.api_url;
    }
    if update.data_dir.is_some() {
        base.data_dir = update.data_dir;
    }
    if update.spell_check.is_some() {
        base.spell_check = update.spell_check;
    }
    if update.experimental.is_some() {
        base.experimental = update.experimental;
    }
    if update.huggingface_token.is_some() {
        base.huggingface_token = update.huggingface_token;
    }
    if update.openai_api_key.is_some() {
        base.openai_api_key = update.openai_api_key;
    }
    if update.anthropic_api_key.is_some() {
        base.anthropic_api_key = update.anthropic_api_key;
    }
    if update.gemini_api_key.is_some() {
        base.gemini_api_key = update.gemini_api_key;
    }
    if update.groq_api_key.is_some() {
        base.groq_api_key = update.groq_api_key;
    }
    if update.openrouter_api_key.is_some() {
        base.openrouter_api_key = update.openrouter_api_key;
    }
    if update.deepseek_api_key.is_some() {
        base.deepseek_api_key = update.deepseek_api_key;
    }
    if update.openai_base_url.is_some() {
        base.openai_base_url = update.openai_base_url;
    }
    if update.anthropic_base_url.is_some() {
        base.anthropic_base_url = update.anthropic_base_url;
    }
    if update.gemini_base_url.is_some() {
        base.gemini_base_url = update.gemini_base_url;
    }
    if update.groq_base_url.is_some() {
        base.groq_base_url = update.groq_base_url;
    }
    if update.openrouter_base_url.is_some() {
        base.openrouter_base_url = update.openrouter_base_url;
    }
    if update.deepseek_base_url.is_some() {
        base.deepseek_base_url = update.deepseek_base_url;
    }
    if update.openai_models.is_some() {
        base.openai_models = update.openai_models;
    }
    if update.anthropic_models.is_some() {
        base.anthropic_models = update.anthropic_models;
    }
    if update.gemini_models.is_some() {
        base.gemini_models = update.gemini_models;
    }
    if update.groq_models.is_some() {
        base.groq_models = update.groq_models;
    }
    if update.openrouter_models.is_some() {
        base.openrouter_models = update.openrouter_models;
    }
    if update.deepseek_models.is_some() {
        base.deepseek_models = update.deepseek_models;
    }
    if update.openai_enabled.is_some() {
        base.openai_enabled = update.openai_enabled;
    }
    if update.anthropic_enabled.is_some() {
        base.anthropic_enabled = update.anthropic_enabled;
    }
    if update.gemini_enabled.is_some() {
        base.gemini_enabled = update.gemini_enabled;
    }
    if update.groq_enabled.is_some() {
        base.groq_enabled = update.groq_enabled;
    }
    if update.openrouter_enabled.is_some() {
        base.openrouter_enabled = update.openrouter_enabled;
    }
    if update.deepseek_enabled.is_some() {
        base.deepseek_enabled = update.deepseek_enabled;
    }
    if let Some(up) = update.appearance {
        let current = base.appearance.get_or_insert_with(Default::default);
        if up.theme.is_some() {
            current.theme = up.theme;
        }
        if up.font_size.is_some() {
            current.font_size = up.font_size;
        }
        if up.code_show_line_numbers.is_some() {
            current.code_show_line_numbers = up.code_show_line_numbers;
        }
        if up.code_theme.is_some() {
            current.code_theme = up.code_theme;
        }
        if up.chat_width.is_some() {
            current.chat_width = up.chat_width;
        }
        if up.window_bg.is_some() {
            current.window_bg = up.window_bg;
        }
        if up.app_bg.is_some() {
            current.app_bg = up.app_bg;
        }
        if up.primary_color.is_some() {
            current.primary_color = up.primary_color;
        }
        if up.accent_color.is_some() {
            current.accent_color = up.accent_color;
        }
        if up.destructive_color.is_some() {
            current.destructive_color = up.destructive_color;
        }
    }
}

// Infer provider from model id and set env var key for genai at runtime
pub fn setup_provider_env_for_model(app: &tauri::AppHandle, model: &str) {
    let settings = read_settings(app).unwrap_or_default();
    // map by prefix/substrings
    if model.starts_with("gpt-") || model.contains("o1") || model.contains("gpt4") {
        if let Some(k) = settings.openai_api_key.or(settings.api_key.clone()) {
            std::env::set_var("OPENAI_API_KEY", k);
        }
        if let Some(url) = settings.openai_base_url {
            std::env::set_var("OPENAI_BASE_URL", url);
        }
    } else if model.starts_with("claude-") {
        if let Some(k) = settings.anthropic_api_key.clone() {
            std::env::set_var("ANTHROPIC_API_KEY", k);
        }
        if let Some(url) = settings.anthropic_base_url {
            std::env::set_var("ANTHROPIC_BASE_URL", url);
        }
    } else if model.starts_with("gemini-") || model.contains("gemini") {
        if let Some(k) = settings.gemini_api_key.clone() {
            std::env::set_var("GEMINI_API_KEY", k);
        }
        if let Some(url) = settings.gemini_base_url {
            std::env::set_var("GEMINI_BASE_URL", url);
        }
    } else if model.contains("groq") || model.starts_with("gemma-") || model.starts_with("llama-") {
        if let Some(k) = settings.groq_api_key.clone() {
            std::env::set_var("GROQ_API_KEY", k);
        }
        if let Some(url) = settings.groq_base_url {
            std::env::set_var("GROQ_BASE_URL", url);
        }
    } else if model.starts_with("deepseek-") || model.starts_with("deepseek/") {
        if let Some(k) = settings.deepseek_api_key.clone() {
            std::env::set_var("DEEPSEEK_API_KEY", k);
        }
        if let Some(url) = settings.deepseek_base_url {
            std::env::set_var("DEEPSEEK_BASE_URL", url);
        }
    } else if is_openrouter_model(model) || model.contains(":") {
        if let Some(k) = settings.openrouter_api_key.clone() {
            std::env::set_var("OPENROUTER_API_KEY", k);
        }
        if let Some(url) = settings.openrouter_base_url {
            std::env::set_var("OPENROUTER_BASE_URL", url);
        }
    }
}

// Tauri Commands
#[tauri::command]
pub async fn get_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    read_settings(&app)
}

#[tauri::command]
pub async fn update_settings(
    app: tauri::AppHandle,
    update: AppSettings,
) -> Result<AppSettings, String> {
    let mut current = read_settings(&app)?;
    merge_settings(&mut current, update);
    write_settings(&app, &current)?;
    Ok(current)
}

#[tauri::command]
pub async fn reset_settings(app: tauri::AppHandle) -> Result<(), String> {
    let path = settings_path(&app)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("remove settings failed: {e}"))?;
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
pub struct GeneralInfo {
    pub app_version: String,
    pub app_data_dir: String,
    pub logs_dir: String,
}

#[tauri::command]
pub async fn get_general_info(app: tauri::AppHandle) -> Result<GeneralInfo, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("paths: {e}"))?;
    let logs_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| format!("paths: {e}"))?;
    Ok(GeneralInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        app_data_dir: app_data_dir.to_string_lossy().to_string(),
        logs_dir: logs_dir.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn set_data_dir(app: tauri::AppHandle, new_dir: String) -> Result<AppSettings, String> {
    let mut current = read_settings(&app)?;
    current.data_dir = Some(new_dir);
    write_settings(&app, &current)?;
    Ok(current)
}

#[tauri::command]
pub async fn reset_appearance(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let mut current = read_settings(&app)?;
    current.appearance = None;
    write_settings(&app, &current)?;
    Ok(current)
}

// Legacy endpoints kept for compatibility with earlier UI
#[tauri::command]
pub async fn save_settings(
    app: tauri::AppHandle,
    api_key: String,
    api_url: Option<String>,
) -> Result<(), String> {
    let mut current = read_settings(&app)?;
    current.api_key = Some(api_key);
    current.api_url = api_url;
    write_settings(&app, &current)
}

#[tauri::command]
pub async fn load_settings(app: tauri::AppHandle) -> Result<Option<SettingsFileLegacy>, String> {
    let current = read_settings(&app)?;
    if let Some(api_key) = current.api_key.clone() {
        return Ok(Some(SettingsFileLegacy {
            api_key,
            api_url: current.api_url.clone(),
        }));
    }
    Ok(None)
}

#[tauri::command]
pub async fn has_settings(app: tauri::AppHandle) -> Result<bool, String> {
    let path = settings_path(&app)?;
    Ok(path.exists())
}

// API Key management commands
#[tauri::command]
pub async fn get_api_key(
    app: tauri::AppHandle,
    provider: String,
) -> Result<Option<String>, String> {
    let settings = read_settings(&app)?;
    let api_key = match provider.as_str() {
        "openai" => settings.openai_api_key,
        "anthropic" => settings.anthropic_api_key,
        "google" | "gemini" => settings.gemini_api_key,
        "groq" => settings.groq_api_key,
        "openrouter" => settings.openrouter_api_key,
        "deepseek" => settings.deepseek_api_key,
        _ => None,
    };
    Ok(api_key)
}

#[tauri::command]
pub async fn set_api_key(
    app: tauri::AppHandle,
    provider: String,
    api_key: String,
) -> Result<(), String> {
    let mut settings = read_settings(&app)?;
    match provider.as_str() {
        "openai" => settings.openai_api_key = Some(api_key),
        "anthropic" => settings.anthropic_api_key = Some(api_key),
        "google" | "gemini" => settings.gemini_api_key = Some(api_key),
        "groq" => settings.groq_api_key = Some(api_key),
        "openrouter" => settings.openrouter_api_key = Some(api_key),
        "deepseek" => settings.deepseek_api_key = Some(api_key),
        _ => return Err(format!("Unknown provider: {}", provider)),
    }
    write_settings(&app, &settings)
}

#[tauri::command]
pub async fn get_provider_config(
    app: tauri::AppHandle,
    provider: String,
) -> Result<ProviderConfig, String> {
    let settings = read_settings(&app)?;
    let config = match provider.as_str() {
        "openai" => ProviderConfig {
            api_key: settings.openai_api_key,
            base_url: settings.openai_base_url,
        },
        "anthropic" => ProviderConfig {
            api_key: settings.anthropic_api_key,
            base_url: settings.anthropic_base_url,
        },
        "google" | "gemini" => ProviderConfig {
            api_key: settings.gemini_api_key,
            base_url: settings.gemini_base_url,
        },
        "groq" => ProviderConfig {
            api_key: settings.groq_api_key,
            base_url: None, // Groq doesn't have configurable base URL
        },
        "openrouter" => ProviderConfig {
            api_key: settings.openrouter_api_key,
            base_url: None, // OpenRouter has fixed base URL
        },
        "deepseek" => ProviderConfig {
            api_key: settings.deepseek_api_key,
            base_url: settings.deepseek_base_url,
        },
        _ => return Err(format!("Unknown provider: {}", provider)),
    };
    Ok(config)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub api_key: Option<String>,
    pub base_url: Option<String>,
}
