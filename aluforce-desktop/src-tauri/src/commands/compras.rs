//! Comandos de Compras

use tauri::AppHandle;
use rusqlite::{Connection, params};
use log::info;

use crate::error::AppError;
use crate::database::get_database_path;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Requisicao {
    pub id: i64,
    pub numero: String,
    pub solicitante: Option<String>,
    pub departamento: Option<String>,
    pub data_solicitacao: String,
    pub data_necessidade: Option<String>,
    pub status: String,
    pub observacoes: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Cotacao {
    pub id: i64,
    pub numero: String,
    pub requisicao_id: Option<i64>,
    pub fornecedor_id: Option<i64>,
    pub data_cotacao: String,
    pub validade: Option<String>,
    pub valor_total: f64,
    pub status: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct PedidoCompra {
    pub id: i64,
    pub numero: String,
    pub fornecedor_id: Option<i64>,
    pub fornecedor_nome: Option<String>,
    pub data_pedido: String,
    pub data_entrega: Option<String>,
    pub valor_total: f64,
    pub status: String,
}

#[tauri::command]
pub async fn get_requisicoes(app: AppHandle) -> Result<Vec<Requisicao>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    // Criar tabela se não existir
    conn.execute(
        "CREATE TABLE IF NOT EXISTS requisicoes_compra (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT UNIQUE,
            solicitante TEXT,
            departamento TEXT,
            data_solicitacao TEXT DEFAULT (date('now')),
            data_necessidade TEXT,
            status TEXT DEFAULT 'pendente',
            observacoes TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )", []
    )?;
    
    let mut stmt = conn.prepare(
        "SELECT id, numero, solicitante, departamento, data_solicitacao, data_necessidade, status, observacoes
         FROM requisicoes_compra ORDER BY created_at DESC"
    )?;
    
    let requisicoes = stmt.query_map([], |row| {
        Ok(Requisicao {
            id: row.get(0)?,
            numero: row.get(1)?,
            solicitante: row.get(2)?,
            departamento: row.get(3)?,
            data_solicitacao: row.get(4)?,
            data_necessidade: row.get(5)?,
            status: row.get(6)?,
            observacoes: row.get(7)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    
    Ok(requisicoes)
}

#[tauri::command]
pub async fn create_requisicao(
    app: AppHandle,
    solicitante: Option<String>,
    departamento: Option<String>,
    data_necessidade: Option<String>,
    observacoes: Option<String>,
) -> Result<Requisicao, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let count: i64 = conn.query_row("SELECT COUNT(*) + 1 FROM requisicoes_compra", [], |row| row.get(0))?;
    let numero = format!("RC{:06}", count);
    
    conn.execute(
        "INSERT INTO requisicoes_compra (numero, solicitante, departamento, data_necessidade, observacoes)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![numero, solicitante, departamento, data_necessidade, observacoes],
    )?;
    
    let id = conn.last_insert_rowid();
    
    Ok(Requisicao {
        id,
        numero,
        solicitante,
        departamento,
        data_solicitacao: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        data_necessidade,
        status: "pendente".to_string(),
        observacoes,
    })
}

#[tauri::command]
pub async fn get_cotacoes(app: AppHandle) -> Result<Vec<Cotacao>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cotacoes_compra (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT UNIQUE,
            requisicao_id INTEGER,
            fornecedor_id INTEGER,
            data_cotacao TEXT DEFAULT (date('now')),
            validade TEXT,
            valor_total REAL DEFAULT 0,
            status TEXT DEFAULT 'pendente',
            created_at TEXT DEFAULT (datetime('now'))
        )", []
    )?;
    
    let mut stmt = conn.prepare(
        "SELECT id, numero, requisicao_id, fornecedor_id, data_cotacao, validade, valor_total, status
         FROM cotacoes_compra ORDER BY created_at DESC"
    )?;
    
    let cotacoes = stmt.query_map([], |row| {
        Ok(Cotacao {
            id: row.get(0)?,
            numero: row.get(1)?,
            requisicao_id: row.get(2)?,
            fornecedor_id: row.get(3)?,
            data_cotacao: row.get(4)?,
            validade: row.get(5)?,
            valor_total: row.get(6)?,
            status: row.get(7)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    
    Ok(cotacoes)
}

#[tauri::command]
pub async fn create_cotacao(
    app: AppHandle,
    requisicao_id: Option<i64>,
    fornecedor_id: Option<i64>,
    valor_total: Option<f64>,
) -> Result<Cotacao, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let count: i64 = conn.query_row("SELECT COUNT(*) + 1 FROM cotacoes_compra", [], |row| row.get(0))?;
    let numero = format!("COT{:06}", count);
    
    conn.execute(
        "INSERT INTO cotacoes_compra (numero, requisicao_id, fornecedor_id, valor_total)
         VALUES (?1, ?2, ?3, ?4)",
        params![numero, requisicao_id, fornecedor_id, valor_total.unwrap_or(0.0)],
    )?;
    
    let id = conn.last_insert_rowid();
    
    Ok(Cotacao {
        id,
        numero,
        requisicao_id,
        fornecedor_id,
        data_cotacao: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        validade: None,
        valor_total: valor_total.unwrap_or(0.0),
        status: "pendente".to_string(),
    })
}

#[tauri::command]
pub async fn get_pedidos_compra(app: AppHandle) -> Result<Vec<PedidoCompra>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pedidos_compra (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT UNIQUE,
            fornecedor_id INTEGER,
            cotacao_id INTEGER,
            data_pedido TEXT DEFAULT (date('now')),
            data_entrega TEXT,
            valor_total REAL DEFAULT 0,
            status TEXT DEFAULT 'pendente',
            observacoes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
        )", []
    )?;
    
    let mut stmt = conn.prepare(
        "SELECT pc.id, pc.numero, pc.fornecedor_id, f.nome, pc.data_pedido, pc.data_entrega, pc.valor_total, pc.status
         FROM pedidos_compra pc
         LEFT JOIN fornecedores f ON f.id = pc.fornecedor_id
         ORDER BY pc.created_at DESC"
    )?;
    
    let pedidos = stmt.query_map([], |row| {
        Ok(PedidoCompra {
            id: row.get(0)?,
            numero: row.get(1)?,
            fornecedor_id: row.get(2)?,
            fornecedor_nome: row.get(3)?,
            data_pedido: row.get(4)?,
            data_entrega: row.get(5)?,
            valor_total: row.get(6)?,
            status: row.get(7)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    
    Ok(pedidos)
}

#[tauri::command]
pub async fn create_pedido_compra(
    app: AppHandle,
    fornecedor_id: Option<i64>,
    data_entrega: Option<String>,
    valor_total: Option<f64>,
) -> Result<PedidoCompra, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let count: i64 = conn.query_row("SELECT COUNT(*) + 1 FROM pedidos_compra", [], |row| row.get(0))?;
    let numero = format!("PC{:06}", count);
    
    conn.execute(
        "INSERT INTO pedidos_compra (numero, fornecedor_id, data_entrega, valor_total)
         VALUES (?1, ?2, ?3, ?4)",
        params![numero, fornecedor_id, data_entrega, valor_total.unwrap_or(0.0)],
    )?;
    
    let id = conn.last_insert_rowid();
    
    Ok(PedidoCompra {
        id,
        numero,
        fornecedor_id,
        fornecedor_nome: None,
        data_pedido: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        data_entrega,
        valor_total: valor_total.unwrap_or(0.0),
        status: "pendente".to_string(),
    })
}
