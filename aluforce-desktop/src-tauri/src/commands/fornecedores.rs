//! Comandos de Fornecedores

use tauri::AppHandle;
use rusqlite::{Connection, params};
use log::info;

use crate::error::AppError;
use crate::models::{Fornecedor, PaginatedResponse};
use crate::database::get_database_path;

#[tauri::command]
pub async fn get_fornecedores(
    app: AppHandle,
    page: Option<i64>,
    per_page: Option<i64>,
) -> Result<PaginatedResponse<Fornecedor>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let page = page.unwrap_or(1);
    let per_page = per_page.unwrap_or(20);
    let offset = (page - 1) * per_page;
    
    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM fornecedores WHERE ativo = 1",
        [],
        |row| row.get(0),
    )?;
    
    let mut stmt = conn.prepare(
        "SELECT id, nome, razao_social, nome_fantasia, cnpj, cpf,
                inscricao_estadual, email, telefone, cep, endereco, numero,
                bairro, cidade, estado, observacoes, ativo, created_at, updated_at
         FROM fornecedores WHERE ativo = 1
         ORDER BY nome ASC LIMIT ?1 OFFSET ?2"
    )?;
    
    let fornecedores = stmt.query_map(params![per_page, offset], |row| {
        Ok(Fornecedor {
            id: row.get(0)?,
            nome: row.get(1)?,
            razao_social: row.get(2)?,
            nome_fantasia: row.get(3)?,
            cnpj: row.get(4)?,
            cpf: row.get(5)?,
            inscricao_estadual: row.get(6)?,
            email: row.get(7)?,
            telefone: row.get(8)?,
            cep: row.get(9)?,
            endereco: row.get(10)?,
            numero: row.get(11)?,
            bairro: row.get(12)?,
            cidade: row.get(13)?,
            estado: row.get(14)?,
            observacoes: row.get(15)?,
            ativo: row.get(16)?,
            created_at: row.get(17)?,
            updated_at: row.get(18)?,
        })
    })?
    .filter_map(|r| r.ok())
    .collect();
    
    Ok(PaginatedResponse::new(fornecedores, total, page, per_page))
}

#[tauri::command]
pub async fn get_fornecedor_by_id(app: AppHandle, id: i64) -> Result<Option<Fornecedor>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let result = conn.query_row(
        "SELECT id, nome, razao_social, nome_fantasia, cnpj, cpf,
                inscricao_estadual, email, telefone, cep, endereco, numero,
                bairro, cidade, estado, observacoes, ativo, created_at, updated_at
         FROM fornecedores WHERE id = ?1",
        params![id],
        |row| Ok(Fornecedor {
            id: row.get(0)?,
            nome: row.get(1)?,
            razao_social: row.get(2)?,
            nome_fantasia: row.get(3)?,
            cnpj: row.get(4)?,
            cpf: row.get(5)?,
            inscricao_estadual: row.get(6)?,
            email: row.get(7)?,
            telefone: row.get(8)?,
            cep: row.get(9)?,
            endereco: row.get(10)?,
            numero: row.get(11)?,
            bairro: row.get(12)?,
            cidade: row.get(13)?,
            estado: row.get(14)?,
            observacoes: row.get(15)?,
            ativo: row.get(16)?,
            created_at: row.get(17)?,
            updated_at: row.get(18)?,
        }),
    );
    
    match result {
        Ok(f) => Ok(Some(f)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

#[tauri::command]
pub async fn create_fornecedor(
    app: AppHandle,
    nome: String,
    cnpj: Option<String>,
    email: Option<String>,
    telefone: Option<String>,
) -> Result<Fornecedor, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute(
        "INSERT INTO fornecedores (nome, cnpj, email, telefone) VALUES (?1, ?2, ?3, ?4)",
        params![nome, cnpj, email, telefone],
    )?;
    
    let id = conn.last_insert_rowid();
    info!("✅ Fornecedor criado: {} (ID: {})", nome, id);
    
    get_fornecedor_by_id(app, id).await?.ok_or(AppError::NotFound("Fornecedor não encontrado".into()))
}

#[tauri::command]
pub async fn update_fornecedor(
    app: AppHandle,
    id: i64,
    nome: String,
    cnpj: Option<String>,
    email: Option<String>,
    telefone: Option<String>,
) -> Result<Fornecedor, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute(
        "UPDATE fornecedores SET nome = ?1, cnpj = ?2, email = ?3, telefone = ?4, updated_at = datetime('now') WHERE id = ?5",
        params![nome, cnpj, email, telefone, id],
    )?;
    
    get_fornecedor_by_id(app, id).await?.ok_or(AppError::NotFound("Fornecedor não encontrado".into()))
}

#[tauri::command]
pub async fn delete_fornecedor(app: AppHandle, id: i64) -> Result<bool, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute("UPDATE fornecedores SET ativo = 0, updated_at = datetime('now') WHERE id = ?1", params![id])?;
    
    Ok(true)
}
