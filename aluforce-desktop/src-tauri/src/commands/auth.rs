//! Comandos de autenticação

use tauri::{AppHandle, State};
use rusqlite::{Connection, params};
use uuid::Uuid;
use chrono::{Utc, Duration};
use log::info;
use std::sync::Mutex;

use crate::error::{AppError, AppResult};
use crate::models::{Usuario, UsuarioPublico, LoginRequest, LoginResponse};
use crate::database::get_database_path;

/// Estado da sessão atual
pub struct AuthState {
    pub current_user: Mutex<Option<UsuarioPublico>>,
    pub session_token: Mutex<Option<String>>,
}

impl Default for AuthState {
    fn default() -> Self {
        Self {
            current_user: Mutex::new(None),
            session_token: Mutex::new(None),
        }
    }
}

/// Realiza login do usuário
#[tauri::command]
pub async fn login(
    app: AppHandle,
    email: String,
    senha: String,
) -> Result<LoginResponse, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    // Buscar usuário por email
    let result: Result<(i64, String, String, Option<String>, Option<String>, Option<String>, String), rusqlite::Error> = 
        conn.query_row(
            "SELECT id, nome, senha_hash, cargo, departamento, avatar, permissoes 
             FROM usuarios WHERE email = ?1 AND ativo = 1",
            params![email],
            |row| Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
            ))
        );
    
    match result {
        Ok((id, nome, senha_hash, cargo, departamento, avatar, permissoes_str)) => {
            // Verificar senha
            if !bcrypt::verify(&senha, &senha_hash).unwrap_or(false) {
                return Ok(LoginResponse {
                    success: false,
                    token: None,
                    usuario: None,
                    message: Some("Senha incorreta".into()),
                });
            }
            
            // Gerar token de sessão
            let token = Uuid::new_v4().to_string();
            let expires_at = (Utc::now() + Duration::hours(24)).to_rfc3339();
            
            // Salvar sessão
            conn.execute(
                "INSERT INTO sessoes (id, usuario_id, token, expires_at) VALUES (?1, ?2, ?3, ?4)",
                params![Uuid::new_v4().to_string(), id, token, expires_at],
            )?;
            
            // Atualizar último acesso
            conn.execute(
                "UPDATE usuarios SET ultimo_acesso = datetime('now') WHERE id = ?1",
                params![id],
            )?;
            
            let permissoes: serde_json::Value = serde_json::from_str(&permissoes_str)
                .unwrap_or(serde_json::json!({}));
            
            let usuario = UsuarioPublico {
                id,
                nome,
                email: email.clone(),
                cargo,
                departamento,
                avatar,
                permissoes,
            };
            
            info!("✅ Login realizado: {}", email);
            
            Ok(LoginResponse {
                success: true,
                token: Some(token),
                usuario: Some(usuario),
                message: None,
            })
        },
        Err(_) => {
            Ok(LoginResponse {
                success: false,
                token: None,
                usuario: None,
                message: Some("Usuário não encontrado".into()),
            })
        }
    }
}

/// Realiza logout do usuário
#[tauri::command]
pub async fn logout(app: AppHandle, token: String) -> Result<bool, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute("DELETE FROM sessoes WHERE token = ?1", params![token])?;
    
    info!("👋 Logout realizado");
    
    Ok(true)
}

/// Obtém usuário atual da sessão
#[tauri::command]
pub async fn get_current_user(app: AppHandle, token: String) -> Result<Option<UsuarioPublico>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let result: Result<(i64, String, String, Option<String>, Option<String>, Option<String>, String), _> = 
        conn.query_row(
            "SELECT u.id, u.nome, u.email, u.cargo, u.departamento, u.avatar, u.permissoes
             FROM usuarios u
             INNER JOIN sessoes s ON s.usuario_id = u.id
             WHERE s.token = ?1 AND s.expires_at > datetime('now') AND u.ativo = 1",
            params![token],
            |row| Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
            ))
        );
    
    match result {
        Ok((id, nome, email, cargo, departamento, avatar, permissoes_str)) => {
            let permissoes: serde_json::Value = serde_json::from_str(&permissoes_str)
                .unwrap_or(serde_json::json!({}));
            
            Ok(Some(UsuarioPublico {
                id,
                nome,
                email,
                cargo,
                departamento,
                avatar,
                permissoes,
            }))
        },
        Err(_) => Ok(None)
    }
}

/// Altera senha do usuário
#[tauri::command]
pub async fn change_password(
    app: AppHandle,
    user_id: i64,
    senha_atual: String,
    nova_senha: String,
) -> Result<bool, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    // Verificar senha atual
    let senha_hash: String = conn.query_row(
        "SELECT senha_hash FROM usuarios WHERE id = ?1",
        params![user_id],
        |row| row.get(0),
    )?;
    
    if !bcrypt::verify(&senha_atual, &senha_hash).unwrap_or(false) {
        return Err(AppError::Authentication("Senha atual incorreta".into()));
    }
    
    // Hash da nova senha
    let nova_hash = bcrypt::hash(&nova_senha, bcrypt::DEFAULT_COST)?;
    
    // Atualizar senha
    conn.execute(
        "UPDATE usuarios SET senha_hash = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![nova_hash, user_id],
    )?;
    
    info!("🔐 Senha alterada para usuário ID: {}", user_id);
    
    Ok(true)
}

/// Valida sessão do usuário
#[tauri::command]
pub async fn validate_session(app: AppHandle, token: String) -> Result<bool, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sessoes WHERE token = ?1 AND expires_at > datetime('now')",
        params![token],
        |row| row.get(0),
    ).unwrap_or(0);
    
    Ok(count > 0)
}
