// Import all modules
pub mod modules;
use modules::system::AppSys;

// Import all commands from modules
use modules::settings::*;
use modules::system::*;
use modules::database::*;
use modules::chat::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppSys::default())
        .invoke_handler(tauri::generate_handler![
            save_settings,
            load_settings,
            has_settings,
            get_hardware_info,
            get_usage_snapshot,
            get_settings,
            update_settings,
            reset_settings,
            get_general_info,
            set_data_dir,
            open_path_in_explorer,
            reveal_path,
            reset_appearance,
            db_list_conversations,
            db_get_messages,
            db_create_conversation,
            db_add_message,
            stream_chat,
            list_chat_models,
            get_adapter_models,
            db_delete_conversation,
            db_archive_conversation,
            db_update_conversation_title,
            db_generate_conversation_title
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