use tauri::{Emitter, State};
use crate::state::AppState;
use crate::db;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AuthStatus {
    pub authenticated: bool,
    pub username: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub provider: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub model: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Settings {
    pub theme: String,
    pub default_model: Option<String>,
    pub system_prompt: Option<String>,
}

/// Find the copilot CLI executable, searching common macOS/Linux/Windows paths
/// that may not be in the GUI app's PATH.
fn find_copilot_cli_path() -> Option<std::path::PathBuf> {
    // Check COPILOT_CLI_PATH env var first
    if let Ok(p) = std::env::var("COPILOT_CLI_PATH") {
        let path = std::path::PathBuf::from(p.trim());
        if path.exists() {
            tracing::info!("Found Copilot CLI via COPILOT_CLI_PATH: {}", path.display());
            return Some(std::fs::canonicalize(&path).unwrap_or(path));
        }
    }

    // Check PATH (works in terminal, may not in GUI apps)
    if let Ok(p) = which::which("copilot") {
        tracing::info!("Found Copilot CLI via PATH: {}", p.display());
        return Some(p);
    }

    // Common install locations for GUI apps that don't inherit full shell PATH
    let extra_paths = [
        "/opt/homebrew/bin/copilot",        // Homebrew Apple Silicon
        "/usr/local/bin/copilot",           // Homebrew Intel / manual install
        "/usr/bin/copilot",                 // System-wide
        "/snap/bin/copilot",                // Snap (Linux)
    ];
    for p in &extra_paths {
        let path = std::path::PathBuf::from(p);
        if path.exists() {
            // Resolve symlinks so the SDK gets the real binary path
            let resolved = std::fs::canonicalize(&path).unwrap_or(path);
            tracing::info!("Found Copilot CLI at hardcoded path: {}", resolved.display());
            return Some(resolved);
        }
    }

    // Check home directory locations
    if let Ok(home) = std::env::var("HOME") {
        let home_paths = [
            format!("{}/.local/bin/copilot", home),
            format!("{}/.cargo/bin/copilot", home),
            format!("{}/bin/copilot", home),
        ];
        for p in &home_paths {
            let path = std::path::PathBuf::from(p);
            if path.exists() {
                let resolved = std::fs::canonicalize(&path).unwrap_or(path);
                tracing::info!("Found Copilot CLI in home dir: {}", resolved.display());
                return Some(resolved);
            }
        }
    }

    #[cfg(windows)]
    {
        if let Ok(p) = which::which("copilot.cmd") {
            return Some(p);
        }
        if let Ok(p) = which::which("copilot.exe") {
            return Some(p);
        }
        if let Ok(appdata) = std::env::var("LOCALAPPDATA") {
            let p = std::path::PathBuf::from(format!("{}\\Programs\\copilot-cli\\copilot.exe", appdata));
            if p.exists() {
                return Some(p);
            }
        }
    }

    tracing::warn!("Could not find Copilot CLI in any known location");
    None
}

#[tauri::command]
pub async fn start_client(state: State<'_, AppState>) -> Result<(), String> {
    let cli_path = find_copilot_cli_path()
        .ok_or_else(|| "Could not find Copilot CLI. Install via: brew install copilot-cli, or set COPILOT_CLI_PATH env var.".to_string())?;

    tracing::info!("Starting Copilot client with CLI at: {}", cli_path.display());

    let client = copilot_sdk::Client::builder()
        .use_stdio(true)
        .cli_path(&cli_path)
        .build()
        .map_err(|e| format!("Failed to build client: {}", e))?;

    client.start().await.map_err(|e| format!("Failed to start client (cli_path={}): {}", cli_path.display(), e))?;

    let mut client_guard = state.client.write().await;
    *client_guard = Some(client);

    tracing::info!("Copilot client started successfully");
    Ok(())
}

#[tauri::command]
pub async fn stop_client(state: State<'_, AppState>) -> Result<(), String> {
    let mut client_guard = state.client.write().await;
    if let Some(client) = client_guard.take() {
        client.stop().await;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_auth_status(state: State<'_, AppState>) -> Result<AuthStatus, String> {
    let client_guard = state.client.read().await;
    let client = client_guard.as_ref().ok_or("Client not started")?;

    match client.get_auth_status().await {
        Ok(auth) => Ok(AuthStatus {
            authenticated: auth.is_authenticated,
            username: auth.login,
        }),
        Err(_) => Ok(AuthStatus {
            authenticated: false,
            username: None,
        }),
    }
}

#[tauri::command]
pub async fn list_models(state: State<'_, AppState>) -> Result<Vec<ModelInfo>, String> {
    // Check cache first
    {
        let cache = state.cached_models.read().await;
        if let Some(ref models) = *cache {
            return Ok(models.clone());
        }
    }

    let client_guard = state.client.read().await;
    let client = client_guard.as_ref().ok_or("Client not started")?;

    let sdk_models = client.list_models().await
        .map_err(|e| format!("Failed to list models: {}", e))?;

    let models: Vec<ModelInfo> = sdk_models.iter().map(|m| ModelInfo {
        id: m.id.clone(),
        name: m.name.clone(),
        provider: None,
    }).collect();

    // Cache result
    {
        let mut cache = state.cached_models.write().await;
        *cache = Some(models.clone());
    }

    Ok(models)
}

#[tauri::command]
pub async fn create_session(
    state: State<'_, AppState>,
    model: Option<String>,
    system_prompt: Option<String>,
) -> Result<String, String> {
    let client_guard = state.client.read().await;
    let client = client_guard.as_ref().ok_or("Client not started")?;

    let mut config = copilot_sdk::SessionConfig::default();
    if let Some(ref model_id) = model {
        config.model = Some(model_id.clone());
    }
    if let Some(ref prompt) = system_prompt {
        config.system_message = Some(copilot_sdk::SystemMessageConfig {
            content: Some(prompt.clone()),
            ..Default::default()
        });
    }

    let session = client.create_session(config).await
        .map_err(|e| format!("Failed to create session: {}", e))?;

    let session_id = session.session_id().to_string();

    let mut sessions = state.sessions.write().await;
    sessions.insert(session_id.clone(), crate::state::SessionInfo {
        session,
        model,
        system_prompt,
    });

    Ok(session_id)
}

#[tauri::command]
pub async fn destroy_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.write().await;
    sessions.remove(&session_id);
    Ok(())
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct MessageDeltaEvent {
    pub session_id: String,
    pub delta: String,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct MessageCompleteEvent {
    pub session_id: String,
    pub content: String,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct SessionErrorEvent {
    pub session_id: String,
    pub message: String,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct SessionIdleEvent {
    pub session_id: String,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct UsageEvent {
    pub session_id: String,
    pub input_tokens: Option<f64>,
    pub output_tokens: Option<f64>,
}

#[tauri::command]
pub async fn send_message(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    content: String,
) -> Result<(), String> {
    let session = {
        let sessions = state.sessions.read().await;
        let session_info = sessions.get(&session_id)
            .ok_or("Session not found")?;
        session_info.session.clone()
    };

    let mut events = session.subscribe();

    session.send(&*content).await
        .map_err(|e| format!("Failed to send message: {}", e))?;

    let sid = session_id;
    let app_handle = app.clone();
    tokio::spawn(async move {
        loop {
            match events.recv().await {
                Ok(event) => {
                    match &event.data {
                        copilot_sdk::SessionEventData::AssistantMessageDelta(delta) => {
                            let _ = app_handle.emit("copilot:message-delta", MessageDeltaEvent {
                                session_id: sid.clone(),
                                delta: delta.delta_content.clone(),
                            });
                        }
                        copilot_sdk::SessionEventData::AssistantMessage(msg) => {
                            let _ = app_handle.emit("copilot:message-complete", MessageCompleteEvent {
                                session_id: sid.clone(),
                                content: msg.content.clone(),
                            });
                        }
                        copilot_sdk::SessionEventData::SessionIdle(_) => {
                            let _ = app_handle.emit("copilot:session-idle", SessionIdleEvent {
                                session_id: sid.clone(),
                            });
                            break;
                        }
                        copilot_sdk::SessionEventData::SessionError(err) => {
                            let _ = app_handle.emit("copilot:session-error", SessionErrorEvent {
                                session_id: sid.clone(),
                                message: err.message.clone(),
                            });
                            break;
                        }
                        copilot_sdk::SessionEventData::AssistantUsage(usage) => {
                            let _ = app_handle.emit("copilot:usage", UsageEvent {
                                session_id: sid.clone(),
                                input_tokens: usage.input_tokens,
                                output_tokens: usage.output_tokens,
                            });
                        }
                        _ => {}
                    }
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn list_conversations(state: State<'_, AppState>) -> Result<Vec<Conversation>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_ref().ok_or("Database not initialized")?;
    db::list_conversations(conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_conversation(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<(Conversation, Vec<Message>), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_ref().ok_or("Database not initialized")?;

    let convo = db::get_conversation(conn, &conversation_id)
        .map_err(|e| e.to_string())?
        .ok_or("Conversation not found")?;
    let msgs = db::get_conversation_messages(conn, &conversation_id)
        .map_err(|e| e.to_string())?;

    Ok((convo, msgs))
}

#[tauri::command]
pub async fn create_conversation(
    state: State<'_, AppState>,
    title: Option<String>,
    model: Option<String>,
) -> Result<Conversation, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_ref().ok_or("Database not initialized")?;

    let id = uuid::Uuid::new_v4().to_string();
    let title = title.unwrap_or_else(|| "New Chat".to_string());

    db::create_conversation(conn, &id, &title, model.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_conversation(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_ref().ok_or("Database not initialized")?;
    db::delete_conversation(conn, &conversation_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_message(
    state: State<'_, AppState>,
    message: Message,
) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_ref().ok_or("Database not initialized")?;
    db::save_message(conn, &message).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_ref().ok_or("Database not initialized")?;

    let theme = crate::db::get_setting(conn, "theme")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "dark".to_string());
    let default_model = crate::db::get_setting(conn, "default_model")
        .map_err(|e| e.to_string())?;
    let system_prompt = crate::db::get_setting(conn, "system_prompt")
        .map_err(|e| e.to_string())?;

    Ok(Settings { theme, default_model, system_prompt })
}

#[tauri::command]
pub async fn update_settings(
    state: State<'_, AppState>,
    settings: Settings,
) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_ref().ok_or("Database not initialized")?;

    crate::db::set_setting(conn, "theme", &settings.theme).map_err(|e| e.to_string())?;
    if let Some(ref model) = settings.default_model {
        crate::db::set_setting(conn, "default_model", model).map_err(|e| e.to_string())?;
    }
    if let Some(ref prompt) = settings.system_prompt {
        crate::db::set_setting(conn, "system_prompt", prompt).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use crate::state::AppState;

    /// Create a test AppState with a temp database
    fn create_test_state() -> AppState {
        let tmp = tempfile::NamedTempFile::new().unwrap();
        let conn = db::open_db(tmp.path().to_str().unwrap()).unwrap();
        db::init_schema(&conn).unwrap();

        let state = AppState::new();
        *state.db.lock().unwrap() = Some(conn);
        // Keep tmp alive so the file isn't deleted
        std::mem::forget(tmp);
        state
    }

    #[test]
    fn test_find_copilot_cli_path() {
        let result = find_copilot_cli_path();
        // Don't assert Some — CI might not have copilot installed
        if let Some(path) = &result {
            assert!(path.exists(), "Found path should exist: {:?}", path);
            assert!(
                std::fs::metadata(path).is_ok(),
                "Path should be accessible: {:?}",
                path
            );
        }
    }

    #[test]
    fn test_find_copilot_cli_path_via_env() {
        let original = std::env::var("COPILOT_CLI_PATH").ok();

        unsafe { std::env::set_var("COPILOT_CLI_PATH", "/bin/sh") };
        let result = find_copilot_cli_path();
        assert!(result.is_some());
        assert!(result.unwrap().to_str().unwrap().contains("sh"));

        // Set to non-existent path — should fall through to other strategies
        unsafe { std::env::set_var("COPILOT_CLI_PATH", "/nonexistent/copilot") };

        // Restore original value
        match original {
            Some(v) => unsafe { std::env::set_var("COPILOT_CLI_PATH", v) },
            None => unsafe { std::env::remove_var("COPILOT_CLI_PATH") },
        }
    }

    #[test]
    fn test_settings_types_serialize() {
        let settings = Settings {
            theme: "dark".to_string(),
            default_model: Some("gpt-4o".to_string()),
            system_prompt: Some("Be helpful".to_string()),
        };
        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("dark"));
        assert!(json.contains("gpt-4o"));

        let deserialized: Settings = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.theme, "dark");
        assert_eq!(deserialized.default_model, Some("gpt-4o".to_string()));
    }

    #[test]
    fn test_auth_status_serialize() {
        let auth = AuthStatus {
            authenticated: true,
            username: Some("testuser".to_string()),
        };
        let json = serde_json::to_string(&auth).unwrap();
        let parsed: AuthStatus = serde_json::from_str(&json).unwrap();
        assert!(parsed.authenticated);
        assert_eq!(parsed.username.unwrap(), "testuser");
    }

    #[test]
    fn test_model_info_serialize() {
        let model = ModelInfo {
            id: "gpt-4o".to_string(),
            name: "GPT-4o".to_string(),
            provider: Some("OpenAI".to_string()),
        };
        let json = serde_json::to_string(&model).unwrap();
        assert!(json.contains("gpt-4o"));
        assert!(json.contains("OpenAI"));

        let parsed: ModelInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "gpt-4o");
    }

    #[test]
    fn test_conversation_serialize() {
        let convo = Conversation {
            id: "c-123".to_string(),
            title: "Test Chat".to_string(),
            model: Some("gpt-4o".to_string()),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&convo).unwrap();
        let parsed: Conversation = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "c-123");
        assert_eq!(parsed.title, "Test Chat");
    }

    #[test]
    fn test_message_serialize() {
        let msg = Message {
            id: "m-1".to_string(),
            conversation_id: "c-1".to_string(),
            role: "user".to_string(),
            content: "Hello world".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&msg).unwrap();
        let parsed: Message = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.content, "Hello world");
        assert_eq!(parsed.role, "user");
    }

    #[test]
    fn test_event_payloads_serialize() {
        let delta = MessageDeltaEvent {
            session_id: "s1".to_string(),
            delta: "Hello ".to_string(),
        };
        let json = serde_json::to_string(&delta).unwrap();
        assert!(json.contains("Hello "));

        let complete = MessageCompleteEvent {
            session_id: "s1".to_string(),
            content: "Hello world".to_string(),
        };
        let json = serde_json::to_string(&complete).unwrap();
        assert!(json.contains("Hello world"));

        let error = SessionErrorEvent {
            session_id: "s1".to_string(),
            message: "Connection failed".to_string(),
        };
        let json = serde_json::to_string(&error).unwrap();
        assert!(json.contains("Connection failed"));

        let idle = SessionIdleEvent {
            session_id: "s1".to_string(),
        };
        assert!(serde_json::to_string(&idle).is_ok());

        let usage = UsageEvent {
            session_id: "s1".to_string(),
            input_tokens: Some(100.0),
            output_tokens: Some(50.0),
        };
        let json = serde_json::to_string(&usage).unwrap();
        assert!(json.contains("100"));
        assert!(json.contains("50"));
    }

    #[test]
    fn test_settings_none_fields_serialize() {
        let settings = Settings {
            theme: "light".to_string(),
            default_model: None,
            system_prompt: None,
        };
        let json = serde_json::to_string(&settings).unwrap();
        let parsed: Settings = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.theme, "light");
        assert!(parsed.default_model.is_none());
        assert!(parsed.system_prompt.is_none());
    }

    #[test]
    fn test_auth_status_unauthenticated() {
        let auth = AuthStatus {
            authenticated: false,
            username: None,
        };
        let json = serde_json::to_string(&auth).unwrap();
        let parsed: AuthStatus = serde_json::from_str(&json).unwrap();
        assert!(!parsed.authenticated);
        assert!(parsed.username.is_none());
    }

    #[test]
    fn test_create_test_state_has_working_db() {
        let state = create_test_state();
        let db_guard = state.db.lock().unwrap();
        let conn = db_guard.as_ref().expect("DB should be initialized");

        db::set_setting(conn, "test_key", "test_value").unwrap();
        let val = db::get_setting(conn, "test_key").unwrap();
        assert_eq!(val, Some("test_value".to_string()));
    }

    #[test]
    fn test_state_db_conversation_roundtrip() {
        let state = create_test_state();
        let db_guard = state.db.lock().unwrap();
        let conn = db_guard.as_ref().unwrap();

        let convo = db::create_conversation(conn, "rt-1", "Roundtrip Test", Some("gpt-4o")).unwrap();
        assert_eq!(convo.id, "rt-1");

        let msg = Message {
            id: "rt-msg-1".to_string(),
            conversation_id: "rt-1".to_string(),
            role: "user".to_string(),
            content: "Testing roundtrip".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
        };
        db::save_message(conn, &msg).unwrap();

        let msgs = db::get_conversation_messages(conn, "rt-1").unwrap();
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].content, "Testing roundtrip");

        let convos = db::list_conversations(conn).unwrap();
        assert_eq!(convos.len(), 1);
    }

    #[test]
    fn test_usage_event_with_none_tokens() {
        let usage = UsageEvent {
            session_id: "s1".to_string(),
            input_tokens: None,
            output_tokens: None,
        };
        let json = serde_json::to_string(&usage).unwrap();
        assert!(json.contains("null"));
    }
}
