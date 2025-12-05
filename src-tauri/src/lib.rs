// Import all modules
pub mod modules;
use modules::system::AppSys;

// Import all commands from modules
use modules::chat::*;
use modules::database::*;
use modules::settings::*;
use modules::system::*;

// Import Tauri window builder components
use tauri::{TitleBarStyle, WebviewUrl, WebviewWindowBuilder};

// Import window vibrancy for macOS blur effects
#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

#[cfg(target_os = "macos")]
#[tauri::command]
fn apply_vibrancy_effect(window: tauri::Window) {
    apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
        .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppSys::default())
        .invoke_handler(tauri::generate_handler![
            save_settings,
            load_settings,
            has_settings,
            get_api_key,
            set_api_key,
            get_provider_config,
            get_hardware_info,
            get_usage_snapshot,
            get_settings,
            update_settings,
            reset_settings,
            get_general_info,
            open_path_in_explorer,
            reveal_path,
            reset_appearance,
            get_username,
            db_list_conversations,
            db_get_messages,
            db_create_conversation,
            db_add_message,
            db_get_ai_messages,
            db_add_ai_message,
            db_save_complete_message,
            stream_ollama_chat,
            list_chat_models,
            get_adapter_models,
            db_delete_conversation,
            db_archive_conversation,
            db_update_conversation_title,
            db_update_conversation_model,
            db_get_conversation,
            #[cfg(target_os = "macos")]
            apply_vibrancy_effect
        ])
        .setup(|app| {
            let mut win_builder =
                WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                    .title("Tethra")
                    .inner_size(1024.0, 800.0)
                    .min_inner_size(375.0, 667.0)
                    .resizable(true)
                    .fullscreen(false)
                    .transparent(true)
                    .decorations(true)
                    .title_bar_style(TitleBarStyle::Visible)
                    .center();

            // `hidden_title` is only available on macOS; gate to avoid Linux/Windows build failures.
            #[cfg(target_os = "macos")]
            {
                win_builder = win_builder.hidden_title(false);
            }

            let window = win_builder.build().unwrap();

            
            // Apply vibrancy effect for blur background on macOS
            #[cfg(target_os = "macos")]
            apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
                .expect("Failed to apply vibrancy");

            if cfg!(debug_assertions) {
                app.handle();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
