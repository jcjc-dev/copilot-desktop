use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use tokio_util::sync::CancellationToken;
use copilot_sdk::{Client, Session};
use rusqlite::Connection;

pub struct SessionInfo {
    pub session: Arc<Session>,
    pub model: Option<String>,
    pub system_prompt: Option<String>,
    /// Token used to cancel the event-processing task when the session is destroyed.
    pub cancel_token: CancellationToken,
}

pub struct AppState {
    pub client: Arc<RwLock<Option<Client>>>,
    pub sessions: Arc<RwLock<HashMap<String, SessionInfo>>>,
    pub db: Arc<Mutex<Option<Connection>>>,
    pub cached_models: RwLock<Option<Vec<crate::commands::ModelInfo>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            client: Arc::new(RwLock::new(None)),
            sessions: Arc::new(RwLock::new(HashMap::new())),
            db: Arc::new(Mutex::new(None)),
            cached_models: RwLock::new(None),
        }
    }
}
