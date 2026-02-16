mod commands;
mod db;
pub mod error;
mod state;

use state::AppState;
use tauri::Manager;

/// Check whether verbose mode is enabled via the COPILOT_VERBOSE environment variable.
/// Set COPILOT_VERBOSE=1 (or =true / =debug / =trace) to enable verbose logging.
pub fn is_verbose() -> bool {
    std::env::var("COPILOT_VERBOSE")
        .map(|v| matches!(v.to_lowercase().as_str(), "1" | "true" | "debug" | "trace"))
        .unwrap_or(false)
}

fn verbose_log_level() -> log::LevelFilter {
    let val = std::env::var("COPILOT_VERBOSE")
        .unwrap_or_default()
        .to_lowercase();
    match val.as_str() {
        "trace" => log::LevelFilter::Trace,
        "1" | "true" | "debug" => log::LevelFilter::Debug,
        _ => log::LevelFilter::Info,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let verbose = is_verbose();

    // Only init tracing in release mode; in debug, tauri_plugin_log handles logging.
    if !cfg!(debug_assertions) {
        if verbose {
            tracing_subscriber::fmt()
                .with_max_level(tracing::Level::DEBUG)
                .init();
        } else {
            tracing_subscriber::fmt::init();
        }
    }

    if verbose {
        eprintln!("[VERBOSE] Copilot Desktop starting in verbose mode");
    }

    tauri::Builder::default()
        .manage(AppState::new())
        .setup(move |app| {
            if cfg!(debug_assertions) {
                let level = verbose_log_level();
                app.handle()
                    .plugin(tauri_plugin_log::Builder::default().level(level).build())?;
                if verbose {
                    tracing::info!("Verbose mode enabled — log level: {:?}", level);
                }
            }

            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
            let db_path = app_dir.join("copilot-desktop.db");

            let conn = db::open_db(db_path.to_str().unwrap()).expect("Failed to open database");
            db::init_schema(&conn).expect("Failed to init schema");

            let state = app.state::<AppState>();
            *state.db.blocking_lock() = Some(conn);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_client,
            commands::stop_client,
            commands::get_auth_status,
            commands::list_models,
            commands::refresh_model_list,
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
