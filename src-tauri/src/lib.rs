mod commands;
mod copilot;
mod db;
mod state;

use tauri::Manager;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Only init tracing in release mode; in debug, tauri_plugin_log handles logging.
    if !cfg!(debug_assertions) {
        tracing_subscriber::fmt::init();
    }

    tauri::Builder::default()
        .manage(AppState::new())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
            let db_path = app_dir.join("copilot-desktop.db");

            let conn = db::open_db(db_path.to_str().unwrap())
                .expect("Failed to open database");
            db::init_schema(&conn).expect("Failed to init schema");

            let state = app.state::<AppState>();
            *state.db.lock().unwrap() = Some(conn);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_client,
            commands::stop_client,
            commands::get_auth_status,
            commands::list_models,
            commands::create_session,
            commands::destroy_session,
            commands::send_message,
            commands::list_conversations,
            commands::get_conversation,
            commands::create_conversation,
            commands::delete_conversation,
            commands::save_message,
            commands::get_settings,
            commands::update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
