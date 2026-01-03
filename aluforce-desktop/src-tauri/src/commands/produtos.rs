//! Comandos de Produtos

use tauri::AppHandle;
use rusqlite::{Connection, params};
use log::info;

use crate::error::AppError;
use crate::models::{Produto, PaginatedResponse};
use crate::database::get_database_path;

#[tauri::command]
pub async fn get_produtos(
    app: AppHandle,
    page: Option<i64>,
    per_page: Option<i64>,
    categoria: Option<String>,
) -> Result<PaginatedResponse<Produto>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let page = page.unwrap_or(1);
    let per_page = per_page.unwrap_or(20);
    let offset = (page - 1) * per_page;
    
    let (total, produtos) = if let Some(cat) = categoria {
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM produtos WHERE ativo = 1 AND categoria = ?1",
            params![cat],
            |row| row.get(0),
        )?;
        
        let mut stmt = conn.prepare(
            "SELECT id, codigo, nome, descricao, categoria, unidade, preco_custo, preco_venda,
                    margem, estoque_minimo, estoque_atual, ncm, cest, origem, cfop,
                    cst_icms, cst_pis, cst_cofins, ativo, created_at, updated_at
             FROM produtos WHERE ativo = 1 AND categoria = ?1
             ORDER BY nome ASC LIMIT ?2 OFFSET ?3"
        )?;
        
        let prods: Vec<Produto> = stmt.query_map(params![cat, per_page, offset], |row| {
            Ok(Produto {
                id: row.get(0)?, codigo: row.get(1)?, nome: row.get(2)?, descricao: row.get(3)?,
                categoria: row.get(4)?, unidade: row.get(5)?, preco_custo: row.get(6)?,
                preco_venda: row.get(7)?, margem: row.get(8)?, estoque_minimo: row.get(9)?,
                estoque_atual: row.get(10)?, ncm: row.get(11)?, cest: row.get(12)?,
                origem: row.get(13)?, cfop: row.get(14)?, cst_icms: row.get(15)?,
                cst_pis: row.get(16)?, cst_cofins: row.get(17)?, ativo: row.get(18)?,
                created_at: row.get(19)?, updated_at: row.get(20)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        (total, prods)
    } else {
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM produtos WHERE ativo = 1", [], |row| row.get(0)
        )?;
        
        let mut stmt = conn.prepare(
            "SELECT id, codigo, nome, descricao, categoria, unidade, preco_custo, preco_venda,
                    margem, estoque_minimo, estoque_atual, ncm, cest, origem, cfop,
                    cst_icms, cst_pis, cst_cofins, ativo, created_at, updated_at
             FROM produtos WHERE ativo = 1 ORDER BY nome ASC LIMIT ?1 OFFSET ?2"
        )?;
        
        let prods: Vec<Produto> = stmt.query_map(params![per_page, offset], |row| {
            Ok(Produto {
                id: row.get(0)?, codigo: row.get(1)?, nome: row.get(2)?, descricao: row.get(3)?,
                categoria: row.get(4)?, unidade: row.get(5)?, preco_custo: row.get(6)?,
                preco_venda: row.get(7)?, margem: row.get(8)?, estoque_minimo: row.get(9)?,
                estoque_atual: row.get(10)?, ncm: row.get(11)?, cest: row.get(12)?,
                origem: row.get(13)?, cfop: row.get(14)?, cst_icms: row.get(15)?,
                cst_pis: row.get(16)?, cst_cofins: row.get(17)?, ativo: row.get(18)?,
                created_at: row.get(19)?, updated_at: row.get(20)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        (total, prods)
    };
    
    Ok(PaginatedResponse::new(produtos, total, page, per_page))
}

#[tauri::command]
pub async fn get_produto_by_id(app: AppHandle, id: i64) -> Result<Option<Produto>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let result = conn.query_row(
        "SELECT id, codigo, nome, descricao, categoria, unidade, preco_custo, preco_venda,
                margem, estoque_minimo, estoque_atual, ncm, cest, origem, cfop,
                cst_icms, cst_pis, cst_cofins, ativo, created_at, updated_at
         FROM produtos WHERE id = ?1",
        params![id],
        |row| Ok(Produto {
            id: row.get(0)?, codigo: row.get(1)?, nome: row.get(2)?, descricao: row.get(3)?,
            categoria: row.get(4)?, unidade: row.get(5)?, preco_custo: row.get(6)?,
            preco_venda: row.get(7)?, margem: row.get(8)?, estoque_minimo: row.get(9)?,
            estoque_atual: row.get(10)?, ncm: row.get(11)?, cest: row.get(12)?,
            origem: row.get(13)?, cfop: row.get(14)?, cst_icms: row.get(15)?,
            cst_pis: row.get(16)?, cst_cofins: row.get(17)?, ativo: row.get(18)?,
            created_at: row.get(19)?, updated_at: row.get(20)?,
        }),
    );
    
    match result {
        Ok(p) => Ok(Some(p)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

#[tauri::command]
pub async fn create_produto(
    app: AppHandle,
    codigo: Option<String>,
    nome: String,
    descricao: Option<String>,
    categoria: Option<String>,
    unidade: Option<String>,
    preco_custo: Option<f64>,
    preco_venda: Option<f64>,
) -> Result<Produto, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let margem = match (preco_custo, preco_venda) {
        (Some(custo), Some(venda)) if custo > 0.0 => ((venda - custo) / custo) * 100.0,
        _ => 0.0,
    };
    
    conn.execute(
        "INSERT INTO produtos (codigo, nome, descricao, categoria, unidade, preco_custo, preco_venda, margem)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![codigo, nome, descricao, categoria, unidade.unwrap_or("UN".into()),
                preco_custo.unwrap_or(0.0), preco_venda.unwrap_or(0.0), margem],
    )?;
    
    let id = conn.last_insert_rowid();
    info!("✅ Produto criado: {} (ID: {})", nome, id);
    
    get_produto_by_id(app, id).await?.ok_or(AppError::NotFound("Produto não encontrado".into()))
}

#[tauri::command]
pub async fn update_produto(
    app: AppHandle,
    id: i64,
    codigo: Option<String>,
    nome: String,
    descricao: Option<String>,
    categoria: Option<String>,
    preco_custo: Option<f64>,
    preco_venda: Option<f64>,
) -> Result<Produto, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute(
        "UPDATE produtos SET codigo = ?1, nome = ?2, descricao = ?3, categoria = ?4,
         preco_custo = ?5, preco_venda = ?6, updated_at = datetime('now') WHERE id = ?7",
        params![codigo, nome, descricao, categoria, preco_custo.unwrap_or(0.0),
                preco_venda.unwrap_or(0.0), id],
    )?;
    
    get_produto_by_id(app, id).await?.ok_or(AppError::NotFound("Produto não encontrado".into()))
}

#[tauri::command]
pub async fn delete_produto(app: AppHandle, id: i64) -> Result<bool, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute("UPDATE produtos SET ativo = 0, updated_at = datetime('now') WHERE id = ?1", params![id])?;
    Ok(true)
}

#[tauri::command]
pub async fn search_produtos(app: AppHandle, termo: String, limit: Option<i64>) -> Result<Vec<Produto>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let search = format!("%{}%", termo);
    let limit = limit.unwrap_or(20);
    
    let mut stmt = conn.prepare(
        "SELECT id, codigo, nome, descricao, categoria, unidade, preco_custo, preco_venda,
                margem, estoque_minimo, estoque_atual, ncm, cest, origem, cfop,
                cst_icms, cst_pis, cst_cofins, ativo, created_at, updated_at
         FROM produtos WHERE ativo = 1 AND (nome LIKE ?1 OR codigo LIKE ?1 OR descricao LIKE ?1)
         ORDER BY nome ASC LIMIT ?2"
    )?;
    
    let produtos = stmt.query_map(params![search, limit], |row| {
        Ok(Produto {
            id: row.get(0)?, codigo: row.get(1)?, nome: row.get(2)?, descricao: row.get(3)?,
            categoria: row.get(4)?, unidade: row.get(5)?, preco_custo: row.get(6)?,
            preco_venda: row.get(7)?, margem: row.get(8)?, estoque_minimo: row.get(9)?,
            estoque_atual: row.get(10)?, ncm: row.get(11)?, cest: row.get(12)?,
            origem: row.get(13)?, cfop: row.get(14)?, cst_icms: row.get(15)?,
            cst_pis: row.get(16)?, cst_cofins: row.get(17)?, ativo: row.get(18)?,
            created_at: row.get(19)?, updated_at: row.get(20)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    
    Ok(produtos)
}
