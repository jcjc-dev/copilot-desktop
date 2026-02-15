use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("{0}")]
    Network(String),
    #[error("{0}")]
    Auth(String),
    #[error("{0}")]
    Validation(String),
    #[error("{0}")]
    Internal(String),
    #[error("{0}")]
    NotFound(String),
}

// Make AppError work as a Tauri command error
impl From<AppError> for String {
    fn from(err: AppError) -> String {
        // Serialize as JSON so frontend can parse the type
        serde_json::to_string(&err).unwrap_or_else(|_| err.to_string())
    }
}
