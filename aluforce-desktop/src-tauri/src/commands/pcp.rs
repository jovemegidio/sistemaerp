//! Comandos de PCP (Planejamento e Controle de Produção)

use tauri::AppHandle;
use rusqlite::{Connection, params};
use log::info;

use crate::error::AppError;
use crate::models::{OrdemProducao, PaginatedResponse};
use crate::database::get_database_path;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct EstoqueItem {
    pub codigo: String,
    pub descricao: Option<String>,
    pub quantidade_fisica: f64,
    pub quantidade_reservada: f64,
    pub quantidade_disponivel: f64,
    pub custo_medio: f64,
    pub valor_estoque: f64,
}

#[tauri::command]
pub async fn get_ordens_producao(
    app: AppHandle,
    page: Option<i64>,
    per_page: Option<i64>,
    status: Option<String>,
) -> Result<PaginatedResponse<OrdemProducao>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let page = page.unwrap_or(1);
    let per_page = per_page.unwrap_or(20);
    let offset = (page - 1) * per_page;
    
    let (total, ordens) = if let Some(st) = status {
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM ordens_producao WHERE status = ?1",
            params![st], |row| row.get(0)
        )?;
        
        let mut stmt = conn.prepare(
            "SELECT op.id, op.numero, op.produto_id, p.nome, op.quantidade, op.data_inicio,
                    op.data_prevista, op.data_conclusao, op.status, op.prioridade,
                    op.responsavel_id, f.nome, op.observacoes
             FROM ordens_producao op
             LEFT JOIN produtos p ON p.id = op.produto_id
             LEFT JOIN funcionarios f ON f.id = op.responsavel_id
             WHERE op.status = ?1
             ORDER BY op.created_at DESC LIMIT ?2 OFFSET ?3"
        )?;
        
        let list: Vec<OrdemProducao> = stmt.query_map(params![st, per_page, offset], |row| {
            Ok(OrdemProducao {
                id: row.get(0)?, numero: row.get(1)?, produto_id: row.get(2)?,
                produto_nome: row.get(3)?, quantidade: row.get(4)?, data_inicio: row.get(5)?,
                data_prevista: row.get(6)?, data_conclusao: row.get(7)?, status: row.get(8)?,
                prioridade: row.get(9)?, responsavel_id: row.get(10)?,
                responsavel_nome: row.get(11)?, observacoes: row.get(12)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        (total, list)
    } else {
        let total: i64 = conn.query_row("SELECT COUNT(*) FROM ordens_producao", [], |row| row.get(0))?;
        
        let mut stmt = conn.prepare(
            "SELECT op.id, op.numero, op.produto_id, p.nome, op.quantidade, op.data_inicio,
                    op.data_prevista, op.data_conclusao, op.status, op.prioridade,
                    op.responsavel_id, f.nome, op.observacoes
             FROM ordens_producao op
             LEFT JOIN produtos p ON p.id = op.produto_id
             LEFT JOIN funcionarios f ON f.id = op.responsavel_id
             ORDER BY op.created_at DESC LIMIT ?1 OFFSET ?2"
        )?;
        
        let list: Vec<OrdemProducao> = stmt.query_map(params![per_page, offset], |row| {
            Ok(OrdemProducao {
                id: row.get(0)?, numero: row.get(1)?, produto_id: row.get(2)?,
                produto_nome: row.get(3)?, quantidade: row.get(4)?, data_inicio: row.get(5)?,
                data_prevista: row.get(6)?, data_conclusao: row.get(7)?, status: row.get(8)?,
                prioridade: row.get(9)?, responsavel_id: row.get(10)?,
                responsavel_nome: row.get(11)?, observacoes: row.get(12)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        (total, list)
    };
    
    Ok(PaginatedResponse::new(ordens, total, page, per_page))
}

#[tauri::command]
pub async fn create_ordem_producao(
    app: AppHandle,
    produto_id: i64,
    quantidade: f64,
    data_prevista: Option<String>,
    prioridade: Option<String>,
    responsavel_id: Option<i64>,
    observacoes: Option<String>,
) -> Result<OrdemProducao, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let count: i64 = conn.query_row("SELECT COUNT(*) + 1 FROM ordens_producao", [], |row| row.get(0))?;
    let numero = format!("OP{:06}", count);
    let data_inicio = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let prioridade_val = prioridade.unwrap_or("normal".into());
    
    conn.execute(
        "INSERT INTO ordens_producao (numero, produto_id, quantidade, data_inicio, data_prevista, prioridade, responsavel_id, observacoes, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'planejada')",
        params![numero, produto_id, quantidade, data_inicio, data_prevista, &prioridade_val, responsavel_id, observacoes],
    )?;
    
    let id = conn.last_insert_rowid();
    
    // Buscar nome do produto
    let produto_nome: Option<String> = conn.query_row(
        "SELECT nome FROM produtos WHERE id = ?1",
        params![produto_id], |row| row.get(0)
    ).ok();
    
    info!("✅ Ordem de produção criada: {} (ID: {})", numero, id);
    
    Ok(OrdemProducao {
        id,
        numero,
        produto_id: Some(produto_id),
        produto_nome,
        quantidade,
        data_inicio: Some(data_inicio),
        data_prevista,
        data_conclusao: None,
        status: "planejada".to_string(),
        prioridade: prioridade_val,
        responsavel_id,
        responsavel_nome: None,
        observacoes,
    })
}

#[tauri::command]
pub async fn update_ordem_producao(
    app: AppHandle,
    id: i64,
    status: Option<String>,
    data_conclusao: Option<String>,
    observacoes: Option<String>,
) -> Result<bool, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    if let Some(st) = status {
        conn.execute(
            "UPDATE ordens_producao SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![st, id]
        )?;
        
        // Se concluída, atualizar data_conclusao
        if st == "concluida" {
            let data = chrono::Utc::now().format("%Y-%m-%d").to_string();
            conn.execute(
                "UPDATE ordens_producao SET data_conclusao = ?1 WHERE id = ?2",
                params![data, id]
            )?;
        }
    }
    
    if let Some(obs) = observacoes {
        conn.execute(
            "UPDATE ordens_producao SET observacoes = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![obs, id]
        )?;
    }
    
    Ok(true)
}

#[tauri::command]
pub async fn get_estoque(app: AppHandle, termo: Option<String>) -> Result<Vec<EstoqueItem>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    // Criar tabela de estoque se não existir
    conn.execute(
        "CREATE TABLE IF NOT EXISTS estoque_saldos (
            codigo TEXT PRIMARY KEY,
            descricao TEXT,
            quantidade_fisica REAL DEFAULT 0,
            quantidade_reservada REAL DEFAULT 0,
            custo_medio REAL DEFAULT 0,
            ultima_entrada TEXT,
            ultima_saida TEXT
        )", []
    )?;
    
    let items = if let Some(t) = termo {
        let search = format!("%{}%", t);
        let mut stmt = conn.prepare(
            "SELECT codigo, descricao, quantidade_fisica, quantidade_reservada,
                    (quantidade_fisica - quantidade_reservada) as disponivel, custo_medio,
                    (quantidade_fisica * custo_medio) as valor
             FROM estoque_saldos
             WHERE codigo LIKE ?1 OR descricao LIKE ?1
             ORDER BY descricao ASC LIMIT 100"
        )?;
        
        let result: Vec<EstoqueItem> = stmt.query_map(params![search], |row| {
            Ok(EstoqueItem {
                codigo: row.get(0)?,
                descricao: row.get(1)?,
                quantidade_fisica: row.get(2)?,
                quantidade_reservada: row.get(3)?,
                quantidade_disponivel: row.get(4)?,
                custo_medio: row.get(5)?,
                valor_estoque: row.get(6)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        result
    } else {
        let mut stmt = conn.prepare(
            "SELECT codigo, descricao, quantidade_fisica, quantidade_reservada,
                    (quantidade_fisica - quantidade_reservada) as disponivel, custo_medio,
                    (quantidade_fisica * custo_medio) as valor
             FROM estoque_saldos ORDER BY descricao ASC LIMIT 100"
        )?;
        
        let result: Vec<EstoqueItem> = stmt.query_map([], |row| {
            Ok(EstoqueItem {
                codigo: row.get(0)?,
                descricao: row.get(1)?,
                quantidade_fisica: row.get(2)?,
                quantidade_reservada: row.get(3)?,
                quantidade_disponivel: row.get(4)?,
                custo_medio: row.get(5)?,
                valor_estoque: row.get(6)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        result
    };
    
    Ok(items)
}

#[tauri::command]
pub async fn atualizar_estoque(
    app: AppHandle,
    codigo: String,
    quantidade: f64,
    tipo: String, // 'entrada' ou 'saida'
    custo: Option<f64>,
) -> Result<EstoqueItem, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    // Verificar se existe
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM estoque_saldos WHERE codigo = ?1",
        params![codigo], |row| row.get(0)
    ).unwrap_or(0);
    
    if existe == 0 {
        // Criar novo registro
        conn.execute(
            "INSERT INTO estoque_saldos (codigo, quantidade_fisica, custo_medio) VALUES (?1, ?2, ?3)",
            params![codigo, if tipo == "entrada" { quantidade } else { 0.0 }, custo.unwrap_or(0.0)],
        )?;
    } else {
        // Atualizar existente
        if tipo == "entrada" {
            conn.execute(
                "UPDATE estoque_saldos SET quantidade_fisica = quantidade_fisica + ?1, ultima_entrada = date('now') WHERE codigo = ?2",
                params![quantidade, codigo],
            )?;
        } else {
            conn.execute(
                "UPDATE estoque_saldos SET quantidade_fisica = quantidade_fisica - ?1, ultima_saida = date('now') WHERE codigo = ?2",
                params![quantidade, codigo],
            )?;
        }
    }
    
    // Retornar item atualizado
    let item = conn.query_row(
        "SELECT codigo, descricao, quantidade_fisica, quantidade_reservada,
                (quantidade_fisica - quantidade_reservada), custo_medio,
                (quantidade_fisica * custo_medio)
         FROM estoque_saldos WHERE codigo = ?1",
        params![codigo],
        |row| Ok(EstoqueItem {
            codigo: row.get(0)?,
            descricao: row.get(1)?,
            quantidade_fisica: row.get(2)?,
            quantidade_reservada: row.get(3)?,
            quantidade_disponivel: row.get(4)?,
            custo_medio: row.get(5)?,
            valor_estoque: row.get(6)?,
        })
    )?;
    
    Ok(item)
}
