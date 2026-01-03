//! Comandos de banco de dados

use tauri::AppHandle;
use rusqlite::Connection;
use base64::Engine;

use crate::error::AppError;
use crate::database::{self, get_database_path};

/// Inicializa banco de dados
#[tauri::command]
pub async fn init_database(app: AppHandle) -> Result<bool, AppError> {
    database::init(&app).await?;
    Ok(true)
}

/// Realiza backup do banco
#[tauri::command]
pub async fn backup_database(app: AppHandle, path: String) -> Result<bool, AppError> {
    database::backup(&app, &path).await?;
    Ok(true)
}

/// Restaura banco de backup
#[tauri::command]
pub async fn restore_database(app: AppHandle, path: String) -> Result<bool, AppError> {
    database::restore(&app, &path).await?;
    Ok(true)
}

/// Executa query genérica (apenas SELECT para segurança)
#[tauri::command]
pub async fn execute_query(
    app: AppHandle, 
    query: String
) -> Result<Vec<serde_json::Value>, AppError> {
    // Validar que é apenas SELECT
    let query_upper = query.to_uppercase();
    if !query_upper.trim().starts_with("SELECT") {
        return Err(AppError::Validation("Apenas queries SELECT são permitidas".into()));
    }
    
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let mut stmt = conn.prepare(&query)?;
    let column_count = stmt.column_count();
    let column_names: Vec<String> = (0..column_count)
        .map(|i| stmt.column_name(i).unwrap_or("").to_string())
        .collect();
    
    let rows = stmt.query_map([], |row| {
        let mut obj = serde_json::Map::new();
        for (i, name) in column_names.iter().enumerate() {
            let value: rusqlite::types::Value = row.get_ref(i)?.into();
            let json_value = match value {
                rusqlite::types::Value::Null => serde_json::Value::Null,
                rusqlite::types::Value::Integer(n) => serde_json::Value::Number(n.into()),
                rusqlite::types::Value::Real(n) => serde_json::json!(n),
                rusqlite::types::Value::Text(s) => serde_json::Value::String(s),
                rusqlite::types::Value::Blob(b) => serde_json::Value::String(
                    base64::engine::general_purpose::STANDARD.encode(&b)
                ),
            };
            obj.insert(name.clone(), json_value);
        }
        Ok(serde_json::Value::Object(obj))
    })?;
    
    let mut results = Vec::new();
    for row in rows {
        if let Ok(r) = row {
            results.push(r);
        }
    }
    
    Ok(results)
}
