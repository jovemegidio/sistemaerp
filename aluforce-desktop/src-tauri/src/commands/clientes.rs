//! Comandos de Clientes

use tauri::AppHandle;
use rusqlite::{Connection, params};
use log::info;

use crate::error::{AppError, AppResult};
use crate::models::{Cliente, ClienteInput, PaginatedResponse};
use crate::database::get_database_path;

/// Lista clientes com paginação
#[tauri::command]
pub async fn get_clientes(
    app: AppHandle,
    page: Option<i64>,
    per_page: Option<i64>,
    ativo: Option<bool>,
) -> Result<PaginatedResponse<Cliente>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let page = page.unwrap_or(1);
    let per_page = per_page.unwrap_or(20);
    let offset = (page - 1) * per_page;
    
    let ativo_filter = ativo.unwrap_or(true);
    
    // Contar total
    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM clientes WHERE ativo = ?1",
        params![ativo_filter],
        |row| row.get(0),
    )?;
    
    // Buscar clientes
    let mut stmt = conn.prepare(
        "SELECT id, nome, razao_social, nome_fantasia, cnpj, cpf, 
                inscricao_estadual, inscricao_municipal, email, telefone, celular,
                cep, endereco, numero, complemento, bairro, cidade, estado,
                observacoes, limite_credito, vendedor_id, ativo, created_at, updated_at
         FROM clientes 
         WHERE ativo = ?1
         ORDER BY nome ASC
         LIMIT ?2 OFFSET ?3"
    )?;
    
    let clientes = stmt.query_map(params![ativo_filter, per_page, offset], |row| {
        Ok(Cliente {
            id: row.get(0)?,
            nome: row.get(1)?,
            razao_social: row.get(2)?,
            nome_fantasia: row.get(3)?,
            cnpj: row.get(4)?,
            cpf: row.get(5)?,
            inscricao_estadual: row.get(6)?,
            inscricao_municipal: row.get(7)?,
            email: row.get(8)?,
            telefone: row.get(9)?,
            celular: row.get(10)?,
            cep: row.get(11)?,
            endereco: row.get(12)?,
            numero: row.get(13)?,
            complemento: row.get(14)?,
            bairro: row.get(15)?,
            cidade: row.get(16)?,
            estado: row.get(17)?,
            observacoes: row.get(18)?,
            limite_credito: row.get(19)?,
            vendedor_id: row.get(20)?,
            ativo: row.get(21)?,
            created_at: row.get(22)?,
            updated_at: row.get(23)?,
        })
    })?
    .filter_map(|r| r.ok())
    .collect();
    
    Ok(PaginatedResponse::new(clientes, total, page, per_page))
}

/// Busca cliente por ID
#[tauri::command]
pub async fn get_cliente_by_id(app: AppHandle, id: i64) -> Result<Option<Cliente>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let result = conn.query_row(
        "SELECT id, nome, razao_social, nome_fantasia, cnpj, cpf, 
                inscricao_estadual, inscricao_municipal, email, telefone, celular,
                cep, endereco, numero, complemento, bairro, cidade, estado,
                observacoes, limite_credito, vendedor_id, ativo, created_at, updated_at
         FROM clientes WHERE id = ?1",
        params![id],
        |row| {
            Ok(Cliente {
                id: row.get(0)?,
                nome: row.get(1)?,
                razao_social: row.get(2)?,
                nome_fantasia: row.get(3)?,
                cnpj: row.get(4)?,
                cpf: row.get(5)?,
                inscricao_estadual: row.get(6)?,
                inscricao_municipal: row.get(7)?,
                email: row.get(8)?,
                telefone: row.get(9)?,
                celular: row.get(10)?,
                cep: row.get(11)?,
                endereco: row.get(12)?,
                numero: row.get(13)?,
                complemento: row.get(14)?,
                bairro: row.get(15)?,
                cidade: row.get(16)?,
                estado: row.get(17)?,
                observacoes: row.get(18)?,
                limite_credito: row.get(19)?,
                vendedor_id: row.get(20)?,
                ativo: row.get(21)?,
                created_at: row.get(22)?,
                updated_at: row.get(23)?,
            })
        },
    );
    
    match result {
        Ok(cliente) => Ok(Some(cliente)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

/// Cria novo cliente
#[tauri::command]
pub async fn create_cliente(app: AppHandle, input: ClienteInput) -> Result<Cliente, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute(
        "INSERT INTO clientes (nome, razao_social, nome_fantasia, cnpj, cpf,
            inscricao_estadual, inscricao_municipal, email, telefone, celular,
            cep, endereco, numero, complemento, bairro, cidade, estado,
            observacoes, limite_credito, vendedor_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
        params![
            input.nome, input.razao_social, input.nome_fantasia, input.cnpj, input.cpf,
            input.inscricao_estadual, input.inscricao_municipal, input.email, input.telefone, input.celular,
            input.cep, input.endereco, input.numero, input.complemento, input.bairro, input.cidade, input.estado,
            input.observacoes, input.limite_credito.unwrap_or(0.0), input.vendedor_id
        ],
    )?;
    
    let id = conn.last_insert_rowid();
    info!("✅ Cliente criado: {} (ID: {})", input.nome, id);
    
    get_cliente_by_id(app, id).await?.ok_or(AppError::NotFound("Cliente não encontrado".into()))
}

/// Atualiza cliente existente
#[tauri::command]
pub async fn update_cliente(app: AppHandle, id: i64, input: ClienteInput) -> Result<Cliente, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute(
        "UPDATE clientes SET 
            nome = ?1, razao_social = ?2, nome_fantasia = ?3, cnpj = ?4, cpf = ?5,
            inscricao_estadual = ?6, inscricao_municipal = ?7, email = ?8, telefone = ?9, celular = ?10,
            cep = ?11, endereco = ?12, numero = ?13, complemento = ?14, bairro = ?15, cidade = ?16, estado = ?17,
            observacoes = ?18, limite_credito = ?19, vendedor_id = ?20, updated_at = datetime('now')
         WHERE id = ?21",
        params![
            input.nome, input.razao_social, input.nome_fantasia, input.cnpj, input.cpf,
            input.inscricao_estadual, input.inscricao_municipal, input.email, input.telefone, input.celular,
            input.cep, input.endereco, input.numero, input.complemento, input.bairro, input.cidade, input.estado,
            input.observacoes, input.limite_credito.unwrap_or(0.0), input.vendedor_id, id
        ],
    )?;
    
    info!("✅ Cliente atualizado: {} (ID: {})", input.nome, id);
    
    get_cliente_by_id(app, id).await?.ok_or(AppError::NotFound("Cliente não encontrado".into()))
}

/// Deleta cliente (soft delete)
#[tauri::command]
pub async fn delete_cliente(app: AppHandle, id: i64) -> Result<bool, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute(
        "UPDATE clientes SET ativo = 0, updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    
    info!("🗑️ Cliente desativado: ID {}", id);
    
    Ok(true)
}

/// Busca clientes por termo
#[tauri::command]
pub async fn search_clientes(
    app: AppHandle,
    termo: String,
    limit: Option<i64>,
) -> Result<Vec<Cliente>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let limit = limit.unwrap_or(20);
    let search_term = format!("%{}%", termo);
    
    let mut stmt = conn.prepare(
        "SELECT id, nome, razao_social, nome_fantasia, cnpj, cpf, 
                inscricao_estadual, inscricao_municipal, email, telefone, celular,
                cep, endereco, numero, complemento, bairro, cidade, estado,
                observacoes, limite_credito, vendedor_id, ativo, created_at, updated_at
         FROM clientes 
         WHERE ativo = 1 AND (
             nome LIKE ?1 OR 
             razao_social LIKE ?1 OR 
             nome_fantasia LIKE ?1 OR 
             cnpj LIKE ?1 OR 
             cpf LIKE ?1 OR
             email LIKE ?1
         )
         ORDER BY nome ASC
         LIMIT ?2"
    )?;
    
    let clientes = stmt.query_map(params![search_term, limit], |row| {
        Ok(Cliente {
            id: row.get(0)?,
            nome: row.get(1)?,
            razao_social: row.get(2)?,
            nome_fantasia: row.get(3)?,
            cnpj: row.get(4)?,
            cpf: row.get(5)?,
            inscricao_estadual: row.get(6)?,
            inscricao_municipal: row.get(7)?,
            email: row.get(8)?,
            telefone: row.get(9)?,
            celular: row.get(10)?,
            cep: row.get(11)?,
            endereco: row.get(12)?,
            numero: row.get(13)?,
            complemento: row.get(14)?,
            bairro: row.get(15)?,
            cidade: row.get(16)?,
            estado: row.get(17)?,
            observacoes: row.get(18)?,
            limite_credito: row.get(19)?,
            vendedor_id: row.get(20)?,
            ativo: row.get(21)?,
            created_at: row.get(22)?,
            updated_at: row.get(23)?,
        })
    })?
    .filter_map(|r| r.ok())
    .collect();
    
    Ok(clientes)
}
