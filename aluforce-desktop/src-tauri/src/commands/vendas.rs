//! Comandos de Vendas

use tauri::AppHandle;
use rusqlite::{Connection, params};
use log::info;
use chrono::Utc;

use crate::error::AppError;
use crate::models::{PedidoVenda, PedidoItem, DashboardVendas, VendasPorVendedor, VendasPorDia, TopProduto, TopCliente, PaginatedResponse};
use crate::database::get_database_path;

#[tauri::command]
pub async fn get_pedidos(
    app: AppHandle,
    page: Option<i64>,
    per_page: Option<i64>,
    status: Option<String>,
) -> Result<PaginatedResponse<PedidoVenda>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let page = page.unwrap_or(1);
    let per_page = per_page.unwrap_or(20);
    let offset = (page - 1) * per_page;
    
    let (total, pedidos) = if let Some(st) = status {
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM pedidos_venda WHERE status = ?1",
            params![st], |row| row.get(0)
        )?;
        
        let mut stmt = conn.prepare(
            "SELECT p.id, p.numero, p.cliente_id, c.nome, p.vendedor_id, u.nome,
                    p.data_pedido, p.data_entrega, p.status, p.subtotal, p.desconto,
                    p.acrescimo, p.total, p.forma_pagamento, p.condicao_pagamento,
                    p.observacoes, p.created_at, p.updated_at
             FROM pedidos_venda p
             LEFT JOIN clientes c ON c.id = p.cliente_id
             LEFT JOIN usuarios u ON u.id = p.vendedor_id
             WHERE p.status = ?1
             ORDER BY p.created_at DESC LIMIT ?2 OFFSET ?3"
        )?;
        
        let peds: Vec<PedidoVenda> = stmt.query_map(params![st, per_page, offset], |row| {
            Ok(PedidoVenda {
                id: row.get(0)?, numero: row.get(1)?, cliente_id: row.get(2)?,
                cliente_nome: row.get(3)?, vendedor_id: row.get(4)?, vendedor_nome: row.get(5)?,
                data_pedido: row.get(6)?, data_entrega: row.get(7)?, status: row.get(8)?,
                subtotal: row.get(9)?, desconto: row.get(10)?, acrescimo: row.get(11)?,
                total: row.get(12)?, forma_pagamento: row.get(13)?, condicao_pagamento: row.get(14)?,
                observacoes: row.get(15)?, itens: vec![], created_at: row.get(16)?, updated_at: row.get(17)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        (total, peds)
    } else {
        let total: i64 = conn.query_row("SELECT COUNT(*) FROM pedidos_venda", [], |row| row.get(0))?;
        
        let mut stmt = conn.prepare(
            "SELECT p.id, p.numero, p.cliente_id, c.nome, p.vendedor_id, u.nome,
                    p.data_pedido, p.data_entrega, p.status, p.subtotal, p.desconto,
                    p.acrescimo, p.total, p.forma_pagamento, p.condicao_pagamento,
                    p.observacoes, p.created_at, p.updated_at
             FROM pedidos_venda p
             LEFT JOIN clientes c ON c.id = p.cliente_id
             LEFT JOIN usuarios u ON u.id = p.vendedor_id
             ORDER BY p.created_at DESC LIMIT ?1 OFFSET ?2"
        )?;
        
        let peds: Vec<PedidoVenda> = stmt.query_map(params![per_page, offset], |row| {
            Ok(PedidoVenda {
                id: row.get(0)?, numero: row.get(1)?, cliente_id: row.get(2)?,
                cliente_nome: row.get(3)?, vendedor_id: row.get(4)?, vendedor_nome: row.get(5)?,
                data_pedido: row.get(6)?, data_entrega: row.get(7)?, status: row.get(8)?,
                subtotal: row.get(9)?, desconto: row.get(10)?, acrescimo: row.get(11)?,
                total: row.get(12)?, forma_pagamento: row.get(13)?, condicao_pagamento: row.get(14)?,
                observacoes: row.get(15)?, itens: vec![], created_at: row.get(16)?, updated_at: row.get(17)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        (total, peds)
    };
    
    Ok(PaginatedResponse::new(pedidos, total, page, per_page))
}

#[tauri::command]
pub async fn get_pedido_by_id(app: AppHandle, id: i64) -> Result<Option<PedidoVenda>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let result = conn.query_row(
        "SELECT p.id, p.numero, p.cliente_id, c.nome, p.vendedor_id, u.nome,
                p.data_pedido, p.data_entrega, p.status, p.subtotal, p.desconto,
                p.acrescimo, p.total, p.forma_pagamento, p.condicao_pagamento,
                p.observacoes, p.created_at, p.updated_at
         FROM pedidos_venda p
         LEFT JOIN clientes c ON c.id = p.cliente_id
         LEFT JOIN usuarios u ON u.id = p.vendedor_id
         WHERE p.id = ?1",
        params![id],
        |row| Ok(PedidoVenda {
            id: row.get(0)?, numero: row.get(1)?, cliente_id: row.get(2)?,
            cliente_nome: row.get(3)?, vendedor_id: row.get(4)?, vendedor_nome: row.get(5)?,
            data_pedido: row.get(6)?, data_entrega: row.get(7)?, status: row.get(8)?,
            subtotal: row.get(9)?, desconto: row.get(10)?, acrescimo: row.get(11)?,
            total: row.get(12)?, forma_pagamento: row.get(13)?, condicao_pagamento: row.get(14)?,
            observacoes: row.get(15)?, itens: vec![], created_at: row.get(16)?, updated_at: row.get(17)?,
        }),
    );
    
    match result {
        Ok(mut pedido) => {
            // Buscar itens
            let mut stmt = conn.prepare(
                "SELECT i.id, i.pedido_id, i.produto_id, pr.nome, i.quantidade,
                        i.preco_unitario, i.desconto, i.total
                 FROM pedido_itens i
                 LEFT JOIN produtos pr ON pr.id = i.produto_id
                 WHERE i.pedido_id = ?1"
            )?;
            
            pedido.itens = stmt.query_map(params![id], |row| {
                Ok(PedidoItem {
                    id: row.get(0)?, pedido_id: row.get(1)?, produto_id: row.get(2)?,
                    produto_nome: row.get(3)?, quantidade: row.get(4)?,
                    preco_unitario: row.get(5)?, desconto: row.get(6)?, total: row.get(7)?,
                })
            })?.filter_map(|r| r.ok()).collect();
            
            Ok(Some(pedido))
        },
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

#[tauri::command]
pub async fn create_pedido(
    app: AppHandle,
    cliente_id: Option<i64>,
    vendedor_id: Option<i64>,
    itens: Vec<serde_json::Value>,
    forma_pagamento: Option<String>,
    observacoes: Option<String>,
) -> Result<PedidoVenda, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    // Gerar número do pedido
    let count: i64 = conn.query_row("SELECT COUNT(*) + 1 FROM pedidos_venda", [], |row| row.get(0))?;
    let numero = format!("PV{:06}", count);
    let data_pedido = Utc::now().format("%Y-%m-%d").to_string();
    
    // Calcular totais
    let mut subtotal = 0.0;
    for item in &itens {
        let qtd = item["quantidade"].as_f64().unwrap_or(1.0);
        let preco = item["preco_unitario"].as_f64().unwrap_or(0.0);
        subtotal += qtd * preco;
    }
    
    conn.execute(
        "INSERT INTO pedidos_venda (numero, cliente_id, vendedor_id, data_pedido, status, subtotal, total, forma_pagamento, observacoes)
         VALUES (?1, ?2, ?3, ?4, 'orcamento', ?5, ?5, ?6, ?7)",
        params![numero, cliente_id, vendedor_id, data_pedido, subtotal, forma_pagamento, observacoes],
    )?;
    
    let pedido_id = conn.last_insert_rowid();
    
    // Inserir itens
    for item in &itens {
        let produto_id = item["produto_id"].as_i64().unwrap_or(0);
        let quantidade = item["quantidade"].as_f64().unwrap_or(1.0);
        let preco_unitario = item["preco_unitario"].as_f64().unwrap_or(0.0);
        let total = quantidade * preco_unitario;
        
        conn.execute(
            "INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, total)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![pedido_id, produto_id, quantidade, preco_unitario, total],
        )?;
    }
    
    info!("✅ Pedido criado: {} (ID: {})", numero, pedido_id);
    
    get_pedido_by_id(app, pedido_id).await?.ok_or(AppError::NotFound("Pedido não encontrado".into()))
}

#[tauri::command]
pub async fn update_pedido(
    app: AppHandle,
    id: i64,
    status: Option<String>,
    forma_pagamento: Option<String>,
    observacoes: Option<String>,
) -> Result<PedidoVenda, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    if let Some(st) = status {
        conn.execute("UPDATE pedidos_venda SET status = ?1, updated_at = datetime('now') WHERE id = ?2", params![st, id])?;
    }
    if let Some(fp) = forma_pagamento {
        conn.execute("UPDATE pedidos_venda SET forma_pagamento = ?1, updated_at = datetime('now') WHERE id = ?2", params![fp, id])?;
    }
    if let Some(obs) = observacoes {
        conn.execute("UPDATE pedidos_venda SET observacoes = ?1, updated_at = datetime('now') WHERE id = ?2", params![obs, id])?;
    }
    
    get_pedido_by_id(app, id).await?.ok_or(AppError::NotFound("Pedido não encontrado".into()))
}

#[tauri::command]
pub async fn delete_pedido(app: AppHandle, id: i64) -> Result<bool, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute("DELETE FROM pedido_itens WHERE pedido_id = ?1", params![id])?;
    conn.execute("DELETE FROM pedidos_venda WHERE id = ?1", params![id])?;
    
    Ok(true)
}

#[tauri::command]
pub async fn get_dashboard_vendas(app: AppHandle) -> Result<DashboardVendas, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let mes_atual = Utc::now().format("%Y-%m").to_string();
    
    let total_vendas_mes: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total), 0) FROM pedidos_venda WHERE strftime('%Y-%m', data_pedido) = ?1 AND status IN ('confirmado', 'faturado')",
        params![mes_atual], |row| row.get(0)
    ).unwrap_or(0.0);
    
    let total_pedidos_mes: i64 = conn.query_row(
        "SELECT COUNT(*) FROM pedidos_venda WHERE strftime('%Y-%m', data_pedido) = ?1",
        params![mes_atual], |row| row.get(0)
    ).unwrap_or(0);
    
    let ticket_medio = if total_pedidos_mes > 0 { total_vendas_mes / total_pedidos_mes as f64 } else { 0.0 };
    
    Ok(DashboardVendas {
        total_vendas_mes,
        total_pedidos_mes,
        ticket_medio,
        vendas_por_vendedor: vec![],
        vendas_por_dia: vec![],
        top_produtos: vec![],
        top_clientes: vec![],
    })
}
