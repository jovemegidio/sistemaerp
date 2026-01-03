//! Comandos do Financeiro

use tauri::AppHandle;
use rusqlite::{Connection, params};
use log::info;

use crate::error::AppError;
use crate::models::{ContaPagar, ContaReceber, ContaBancaria, DashboardFinanceiro, FluxoCaixaDia, PaginatedResponse};
use crate::database::get_database_path;

#[tauri::command]
pub async fn get_contas_pagar(
    app: AppHandle,
    page: Option<i64>,
    per_page: Option<i64>,
    status: Option<String>,
) -> Result<PaginatedResponse<ContaPagar>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let page = page.unwrap_or(1);
    let per_page = per_page.unwrap_or(20);
    let offset = (page - 1) * per_page;
    
    let (total, contas) = if let Some(st) = status {
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM contas_pagar WHERE status = ?1",
            params![st], |row| row.get(0)
        )?;
        
        let mut stmt = conn.prepare(
            "SELECT cp.id, cp.descricao, cp.fornecedor_id, f.nome, cp.valor, cp.data_vencimento,
                    cp.data_pagamento, cp.status, cp.categoria, cp.forma_pagamento, cp.observacoes,
                    cp.created_at, cp.updated_at
             FROM contas_pagar cp
             LEFT JOIN fornecedores f ON f.id = cp.fornecedor_id
             WHERE cp.status = ?1
             ORDER BY cp.data_vencimento ASC LIMIT ?2 OFFSET ?3"
        )?;
        
        let list: Vec<ContaPagar> = stmt.query_map(params![st, per_page, offset], |row| {
            Ok(ContaPagar {
                id: row.get(0)?, descricao: row.get(1)?, fornecedor_id: row.get(2)?,
                fornecedor_nome: row.get(3)?, valor: row.get(4)?, data_vencimento: row.get(5)?,
                data_pagamento: row.get(6)?, status: row.get(7)?, categoria: row.get(8)?,
                forma_pagamento: row.get(9)?, observacoes: row.get(10)?,
                created_at: row.get(11)?, updated_at: row.get(12)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        (total, list)
    } else {
        let total: i64 = conn.query_row("SELECT COUNT(*) FROM contas_pagar", [], |row| row.get(0))?;
        
        let mut stmt = conn.prepare(
            "SELECT cp.id, cp.descricao, cp.fornecedor_id, f.nome, cp.valor, cp.data_vencimento,
                    cp.data_pagamento, cp.status, cp.categoria, cp.forma_pagamento, cp.observacoes,
                    cp.created_at, cp.updated_at
             FROM contas_pagar cp
             LEFT JOIN fornecedores f ON f.id = cp.fornecedor_id
             ORDER BY cp.data_vencimento ASC LIMIT ?1 OFFSET ?2"
        )?;
        
        let list: Vec<ContaPagar> = stmt.query_map(params![per_page, offset], |row| {
            Ok(ContaPagar {
                id: row.get(0)?, descricao: row.get(1)?, fornecedor_id: row.get(2)?,
                fornecedor_nome: row.get(3)?, valor: row.get(4)?, data_vencimento: row.get(5)?,
                data_pagamento: row.get(6)?, status: row.get(7)?, categoria: row.get(8)?,
                forma_pagamento: row.get(9)?, observacoes: row.get(10)?,
                created_at: row.get(11)?, updated_at: row.get(12)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        (total, list)
    };
    
    Ok(PaginatedResponse::new(contas, total, page, per_page))
}

#[tauri::command]
pub async fn get_contas_receber(
    app: AppHandle,
    page: Option<i64>,
    per_page: Option<i64>,
    status: Option<String>,
) -> Result<PaginatedResponse<ContaReceber>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let page = page.unwrap_or(1);
    let per_page = per_page.unwrap_or(20);
    let offset = (page - 1) * per_page;
    
    let total: i64 = conn.query_row("SELECT COUNT(*) FROM contas_receber", [], |row| row.get(0))?;
    
    let mut stmt = conn.prepare(
        "SELECT cr.id, cr.descricao, cr.cliente_id, c.nome, cr.pedido_id, cr.valor, cr.data_vencimento,
                cr.data_recebimento, cr.status, cr.categoria, cr.forma_recebimento, cr.observacoes,
                cr.created_at, cr.updated_at
         FROM contas_receber cr
         LEFT JOIN clientes c ON c.id = cr.cliente_id
         ORDER BY cr.data_vencimento ASC LIMIT ?1 OFFSET ?2"
    )?;
    
    let contas: Vec<ContaReceber> = stmt.query_map(params![per_page, offset], |row| {
        Ok(ContaReceber {
            id: row.get(0)?, descricao: row.get(1)?, cliente_id: row.get(2)?,
            cliente_nome: row.get(3)?, pedido_id: row.get(4)?, valor: row.get(5)?,
            data_vencimento: row.get(6)?, data_recebimento: row.get(7)?, status: row.get(8)?,
            categoria: row.get(9)?, forma_recebimento: row.get(10)?, observacoes: row.get(11)?,
            created_at: row.get(12)?, updated_at: row.get(13)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    
    Ok(PaginatedResponse::new(contas, total, page, per_page))
}

#[tauri::command]
pub async fn get_contas_bancarias(app: AppHandle) -> Result<Vec<ContaBancaria>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let mut stmt = conn.prepare(
        "SELECT id, nome, banco, agencia, conta, tipo, saldo_inicial, saldo_atual, ativo
         FROM contas_bancarias WHERE ativo = 1 ORDER BY nome ASC"
    )?;
    
    let contas = stmt.query_map([], |row| {
        Ok(ContaBancaria {
            id: row.get(0)?, nome: row.get(1)?, banco: row.get(2)?, agencia: row.get(3)?,
            conta: row.get(4)?, tipo: row.get(5)?, saldo_inicial: row.get(6)?,
            saldo_atual: row.get(7)?, ativo: row.get(8)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    
    Ok(contas)
}

#[tauri::command]
pub async fn create_lancamento(
    app: AppHandle,
    tipo: String, // 'pagar' ou 'receber'
    descricao: String,
    valor: f64,
    data_vencimento: String,
    fornecedor_id: Option<i64>,
    cliente_id: Option<i64>,
    categoria: Option<String>,
) -> Result<bool, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    if tipo == "pagar" {
        conn.execute(
            "INSERT INTO contas_pagar (descricao, fornecedor_id, valor, data_vencimento, categoria, status)
             VALUES (?1, ?2, ?3, ?4, ?5, 'pendente')",
            params![descricao, fornecedor_id, valor, data_vencimento, categoria],
        )?;
    } else {
        conn.execute(
            "INSERT INTO contas_receber (descricao, cliente_id, valor, data_vencimento, categoria, status)
             VALUES (?1, ?2, ?3, ?4, ?5, 'pendente')",
            params![descricao, cliente_id, valor, data_vencimento, categoria],
        )?;
    }
    
    info!("✅ Lançamento criado: {} - R$ {:.2}", descricao, valor);
    
    Ok(true)
}

#[tauri::command]
pub async fn get_fluxo_caixa(
    app: AppHandle,
    data_inicio: String,
    data_fim: String,
) -> Result<Vec<FluxoCaixaDia>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    // Entradas (recebimentos)
    let mut stmt_entradas = conn.prepare(
        "SELECT date(data_recebimento) as data, SUM(valor) as total
         FROM contas_receber
         WHERE status = 'recebido' AND data_recebimento BETWEEN ?1 AND ?2
         GROUP BY date(data_recebimento)"
    )?;
    
    let entradas: std::collections::HashMap<String, f64> = stmt_entradas.query_map(params![data_inicio, data_fim], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
    })?.filter_map(|r| r.ok()).collect();
    
    // Saídas (pagamentos)
    let mut stmt_saidas = conn.prepare(
        "SELECT date(data_pagamento) as data, SUM(valor) as total
         FROM contas_pagar
         WHERE status = 'pago' AND data_pagamento BETWEEN ?1 AND ?2
         GROUP BY date(data_pagamento)"
    )?;
    
    let saidas: std::collections::HashMap<String, f64> = stmt_saidas.query_map(params![data_inicio, data_fim], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
    })?.filter_map(|r| r.ok()).collect();
    
    // Combinar
    let mut datas: std::collections::HashSet<String> = std::collections::HashSet::new();
    datas.extend(entradas.keys().cloned());
    datas.extend(saidas.keys().cloned());
    
    let mut fluxo: Vec<FluxoCaixaDia> = datas.into_iter().map(|data| {
        let ent = *entradas.get(&data).unwrap_or(&0.0);
        let sai = *saidas.get(&data).unwrap_or(&0.0);
        FluxoCaixaDia {
            data: data.clone(),
            entradas: ent,
            saidas: sai,
            saldo: ent - sai,
        }
    }).collect();
    
    fluxo.sort_by(|a, b| a.data.cmp(&b.data));
    
    Ok(fluxo)
}

#[tauri::command]
pub async fn get_dashboard_financeiro(app: AppHandle) -> Result<DashboardFinanceiro, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let saldo_total: f64 = conn.query_row(
        "SELECT COALESCE(SUM(saldo_atual), 0) FROM contas_bancarias WHERE ativo = 1",
        [], |row| row.get(0)
    ).unwrap_or(0.0);
    
    let a_receber: f64 = conn.query_row(
        "SELECT COALESCE(SUM(valor), 0) FROM contas_receber WHERE status = 'pendente'",
        [], |row| row.get(0)
    ).unwrap_or(0.0);
    
    let a_pagar: f64 = conn.query_row(
        "SELECT COALESCE(SUM(valor), 0) FROM contas_pagar WHERE status = 'pendente'",
        [], |row| row.get(0)
    ).unwrap_or(0.0);
    
    let mes = chrono::Utc::now().format("%Y-%m").to_string();
    
    let recebido_mes: f64 = conn.query_row(
        "SELECT COALESCE(SUM(valor), 0) FROM contas_receber WHERE status = 'recebido' AND strftime('%Y-%m', data_recebimento) = ?1",
        params![mes], |row| row.get(0)
    ).unwrap_or(0.0);
    
    let pago_mes: f64 = conn.query_row(
        "SELECT COALESCE(SUM(valor), 0) FROM contas_pagar WHERE status = 'pago' AND strftime('%Y-%m', data_pagamento) = ?1",
        params![mes], |row| row.get(0)
    ).unwrap_or(0.0);
    
    let hoje = chrono::Utc::now().format("%Y-%m-%d").to_string();
    
    let vencidas: i64 = conn.query_row(
        "SELECT COUNT(*) FROM contas_pagar WHERE status = 'pendente' AND data_vencimento < ?1",
        params![hoje], |row| row.get(0)
    ).unwrap_or(0);
    
    let vencer_hoje: i64 = conn.query_row(
        "SELECT COUNT(*) FROM contas_pagar WHERE status = 'pendente' AND data_vencimento = ?1",
        params![hoje], |row| row.get(0)
    ).unwrap_or(0);
    
    Ok(DashboardFinanceiro {
        saldo_total,
        a_receber,
        a_pagar,
        recebido_mes,
        pago_mes,
        vencidas,
        vencer_hoje,
        fluxo_caixa: vec![],
    })
}
