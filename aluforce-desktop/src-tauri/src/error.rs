//! Módulo de tratamento de erros personalizado

use thiserror::Error;
use serde::Serialize;

/// Tipos de erro da aplicação
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Erro de banco de dados: {0}")]
    Database(String),
    
    #[error("Erro de autenticação: {0}")]
    Authentication(String),
    
    #[error("Erro de autorização: {0}")]
    Authorization(String),
    
    #[error("Recurso não encontrado: {0}")]
    NotFound(String),
    
    #[error("Dados inválidos: {0}")]
    Validation(String),
    
    #[error("Erro interno: {0}")]
    Internal(String),
    
    #[error("Erro de IO: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Erro de serialização: {0}")]
    Serialization(String),
}

/// Estrutura de resposta de erro para o frontend
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
}

impl From<AppError> for ErrorResponse {
    fn from(error: AppError) -> Self {
        let (code, message) = match &error {
            AppError::Database(msg) => ("DATABASE_ERROR", msg.clone()),
            AppError::Authentication(msg) => ("AUTH_ERROR", msg.clone()),
            AppError::Authorization(msg) => ("FORBIDDEN", msg.clone()),
            AppError::NotFound(msg) => ("NOT_FOUND", msg.clone()),
            AppError::Validation(msg) => ("VALIDATION_ERROR", msg.clone()),
            AppError::Internal(msg) => ("INTERNAL_ERROR", msg.clone()),
            AppError::Io(e) => ("IO_ERROR", e.to_string()),
            AppError::Serialization(msg) => ("SERIALIZATION_ERROR", msg.clone()),
        };
        
        ErrorResponse {
            code: code.to_string(),
            message,
            details: None,
        }
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(error: rusqlite::Error) -> Self {
        AppError::Database(error.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        AppError::Serialization(error.to_string())
    }
}

impl From<bcrypt::BcryptError> for AppError {
    fn from(error: bcrypt::BcryptError) -> Self {
        AppError::Internal(error.to_string())
    }
}

// Implementação para Tauri
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        let response = ErrorResponse::from(self.clone());
        response.serialize(serializer)
    }
}

impl Clone for AppError {
    fn clone(&self) -> Self {
        match self {
            AppError::Database(s) => AppError::Database(s.clone()),
            AppError::Authentication(s) => AppError::Authentication(s.clone()),
            AppError::Authorization(s) => AppError::Authorization(s.clone()),
            AppError::NotFound(s) => AppError::NotFound(s.clone()),
            AppError::Validation(s) => AppError::Validation(s.clone()),
            AppError::Internal(s) => AppError::Internal(s.clone()),
            AppError::Io(e) => AppError::Internal(e.to_string()),
            AppError::Serialization(s) => AppError::Serialization(s.clone()),
        }
    }
}

/// Tipo Result personalizado
pub type AppResult<T> = Result<T, AppError>;
