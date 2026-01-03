//! Comandos de Configuração

use tauri::AppHandle;
use rusqlite::{Connection, params};
use log::info;

use crate::error::AppError;
use crate::models::{Empresa, Config};
use crate::database::get_database_path;

#[tauri::command]
pub async fn get_config(app: AppHandle, chave: String) -> Result<Option<serde_json::Value>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let result: Result<String, _> = conn.query_row(
        "SELECT valor FROM configuracoes WHERE chave = ?1",
        params![chave],
        |row| row.get(0)
    );
    
    match result {
        Ok(valor) => {
            let parsed: serde_json::Value = serde_json::from_str(&valor)
                .unwrap_or(serde_json::Value::String(valor));
            Ok(Some(parsed))
        },
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

#[tauri::command]
pub async fn save_config(
    app: AppHandle,
    chave: String,
    valor: serde_json::Value,
) -> Result<bool, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let valor_str = serde_json::to_string(&valor)?;
    
    conn.execute(
        "INSERT OR REPLACE INTO configuracoes (chave, valor, updated_at) VALUES (?1, ?2, datetime('now'))",
        params![chave, valor_str],
    )?;
    
    info!("✅ Configuração salva: {}", chave);
    
    Ok(true)
}

#[tauri::command]
pub async fn get_empresa(app: AppHandle) -> Result<Option<Empresa>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let result = conn.query_row(
        "SELECT id, razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                telefone, email, cep, endereco, numero, complemento, bairro, cidade, estado, logo_path
         FROM empresas LIMIT 1",
        [],
        |row| Ok(Empresa {
            id: row.get(0)?,
            razao_social: row.get(1)?,
            nome_fantasia: row.get(2)?,
            cnpj: row.get(3)?,
            inscricao_estadual: row.get(4)?,
            inscricao_municipal: row.get(5)?,
            telefone: row.get(6)?,
            email: row.get(7)?,
            cep: row.get(8)?,
            endereco: row.get(9)?,
            numero: row.get(10)?,
            complemento: row.get(11)?,
            bairro: row.get(12)?,
            cidade: row.get(13)?,
            estado: row.get(14)?,
            logo_path: row.get(15)?,
        })
    );
    
    match result {
        Ok(e) => Ok(Some(e)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

#[tauri::command]
pub async fn save_empresa(
    app: AppHandle,
    razao_social: String,
    nome_fantasia: Option<String>,
    cnpj: Option<String>,
    inscricao_estadual: Option<String>,
    inscricao_municipal: Option<String>,
    telefone: Option<String>,
    email: Option<String>,
    cep: Option<String>,
    endereco: Option<String>,
    numero: Option<String>,
    complemento: Option<String>,
    bairro: Option<String>,
    cidade: Option<String>,
    estado: Option<String>,
) -> Result<Empresa, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    // Verificar se já existe empresa
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM empresas", [], |row| row.get(0))?;
    
    if count == 0 {
        conn.execute(
            "INSERT INTO empresas (razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
             telefone, email, cep, endereco, numero, complemento, bairro, cidade, estado)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                    telefone, email, cep, endereco, numero, complemento, bairro, cidade, estado],
        )?;
    } else {
        conn.execute(
            "UPDATE empresas SET razao_social = ?1, nome_fantasia = ?2, cnpj = ?3, inscricao_estadual = ?4,
             inscricao_municipal = ?5, telefone = ?6, email = ?7, cep = ?8, endereco = ?9, numero = ?10,
             complemento = ?11, bairro = ?12, cidade = ?13, estado = ?14, updated_at = datetime('now')
             WHERE id = 1",
            params![razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                    telefone, email, cep, endereco, numero, complemento, bairro, cidade, estado],
        )?;
    }
    
    info!("✅ Dados da empresa salvos");
    
    get_empresa(app).await?.ok_or(AppError::NotFound("Empresa não encontrada".into()))
}
