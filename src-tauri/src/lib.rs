// Import all modules
pub mod modules;
use modules::system::AppSys;

// Import all commands from modules
use modules::chat::*;
use modules::database::*;
use modules::settings::*;
use modules::system::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            db_get_conversation
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
