//! Comandos de NFe (Nota Fiscal Eletrônica)

use tauri::AppHandle;
use rusqlite::{Connection, params};
use log::info;

use crate::error::AppError;
use crate::models::{NotaFiscal, PaginatedResponse};
use crate::database::get_database_path;

#[tauri::command]
pub async fn get_nfes(
    app: AppHandle,
    page: Option<i64>,
    per_page: Option<i64>,
    status: Option<String>,
    tipo: Option<String>,
) -> Result<PaginatedResponse<NotaFiscal>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let page = page.unwrap_or(1);
    let per_page = per_page.unwrap_or(20);
    let offset = (page - 1) * per_page;
    
    let total: i64 = conn.query_row("SELECT COUNT(*) FROM notas_fiscais", [], |row| row.get(0))?;
    
    let mut stmt = conn.prepare(
        "SELECT nf.id, nf.numero, nf.serie, nf.chave, nf.tipo, nf.natureza_operacao,
                nf.data_emissao, nf.data_saida, nf.cliente_id, c.nome, nf.fornecedor_id,
                nf.pedido_id, nf.valor_produtos, nf.valor_frete, nf.valor_seguro,
                nf.valor_desconto, nf.valor_total, nf.status, nf.protocolo, nf.observacoes
         FROM notas_fiscais nf
         LEFT JOIN clientes c ON c.id = nf.cliente_id
         ORDER BY nf.data_emissao DESC LIMIT ?1 OFFSET ?2"
    )?;
    
    let nfes: Vec<NotaFiscal> = stmt.query_map(params![per_page, offset], |row| {
        Ok(NotaFiscal {
            id: row.get(0)?, numero: row.get(1)?, serie: row.get(2)?, chave: row.get(3)?,
            tipo: row.get(4)?, natureza_operacao: row.get(5)?, data_emissao: row.get(6)?,
            data_saida: row.get(7)?, cliente_id: row.get(8)?, cliente_nome: row.get(9)?,
            fornecedor_id: row.get(10)?, pedido_id: row.get(11)?, valor_produtos: row.get(12)?,
            valor_frete: row.get(13)?, valor_seguro: row.get(14)?, valor_desconto: row.get(15)?,
            valor_total: row.get(16)?, status: row.get(17)?, protocolo: row.get(18)?,
            observacoes: row.get(19)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    
    Ok(PaginatedResponse::new(nfes, total, page, per_page))
}

#[tauri::command]
pub async fn emitir_nfe(
    app: AppHandle,
    pedido_id: i64,
    natureza_operacao: String,
) -> Result<NotaFiscal, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    // Buscar dados do pedido
    let (cliente_id, valor_total): (Option<i64>, f64) = conn.query_row(
        "SELECT cliente_id, total FROM pedidos_venda WHERE id = ?1",
        params![pedido_id],
        |row| Ok((row.get(0)?, row.get(1)?))
    )?;
    
    // Gerar número da NFe
    let count: i64 = conn.query_row("SELECT COUNT(*) + 1 FROM notas_fiscais WHERE tipo = 'saida'", [], |row| row.get(0))?;
    let numero = format!("{}", count);
    let serie = "1".to_string();
    let data_emissao = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    // Gerar chave (simplificada - em produção usar algoritmo real)
    let chave = format!("35{}00000000000100550010000{:09}1{:09}0", 
        chrono::Utc::now().format("%y%m"), count, count);
    
    conn.execute(
        "INSERT INTO notas_fiscais (numero, serie, chave, tipo, natureza_operacao, data_emissao,
         cliente_id, pedido_id, valor_produtos, valor_total, status)
         VALUES (?1, ?2, ?3, 'saida', ?4, ?5, ?6, ?7, ?8, ?8, 'pendente')",
        params![numero, serie, chave, natureza_operacao, data_emissao, cliente_id, pedido_id, valor_total],
    )?;
    
    let id = conn.last_insert_rowid();
    info!("✅ NFe criada: {} (ID: {})", numero, id);
    
    // Buscar NFe criada
    let nfe = conn.query_row(
        "SELECT nf.id, nf.numero, nf.serie, nf.chave, nf.tipo, nf.natureza_operacao,
                nf.data_emissao, nf.data_saida, nf.cliente_id, c.nome, nf.fornecedor_id,
                nf.pedido_id, nf.valor_produtos, nf.valor_frete, nf.valor_seguro,
                nf.valor_desconto, nf.valor_total, nf.status, nf.protocolo, nf.observacoes
         FROM notas_fiscais nf
         LEFT JOIN clientes c ON c.id = nf.cliente_id
         WHERE nf.id = ?1",
        params![id],
        |row| Ok(NotaFiscal {
            id: row.get(0)?, numero: row.get(1)?, serie: row.get(2)?, chave: row.get(3)?,
            tipo: row.get(4)?, natureza_operacao: row.get(5)?, data_emissao: row.get(6)?,
            data_saida: row.get(7)?, cliente_id: row.get(8)?, cliente_nome: row.get(9)?,
            fornecedor_id: row.get(10)?, pedido_id: row.get(11)?, valor_produtos: row.get(12)?,
            valor_frete: row.get(13)?, valor_seguro: row.get(14)?, valor_desconto: row.get(15)?,
            valor_total: row.get(16)?, status: row.get(17)?, protocolo: row.get(18)?,
            observacoes: row.get(19)?,
        })
    )?;
    
    Ok(nfe)
}

#[tauri::command]
pub async fn consultar_nfe(app: AppHandle, chave: String) -> Result<Option<NotaFiscal>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let result = conn.query_row(
        "SELECT nf.id, nf.numero, nf.serie, nf.chave, nf.tipo, nf.natureza_operacao,
                nf.data_emissao, nf.data_saida, nf.cliente_id, c.nome, nf.fornecedor_id,
                nf.pedido_id, nf.valor_produtos, nf.valor_frete, nf.valor_seguro,
                nf.valor_desconto, nf.valor_total, nf.status, nf.protocolo, nf.observacoes
         FROM notas_fiscais nf
         LEFT JOIN clientes c ON c.id = nf.cliente_id
         WHERE nf.chave = ?1",
        params![chave],
        |row| Ok(NotaFiscal {
            id: row.get(0)?, numero: row.get(1)?, serie: row.get(2)?, chave: row.get(3)?,
            tipo: row.get(4)?, natureza_operacao: row.get(5)?, data_emissao: row.get(6)?,
            data_saida: row.get(7)?, cliente_id: row.get(8)?, cliente_nome: row.get(9)?,
            fornecedor_id: row.get(10)?, pedido_id: row.get(11)?, valor_produtos: row.get(12)?,
            valor_frete: row.get(13)?, valor_seguro: row.get(14)?, valor_desconto: row.get(15)?,
            valor_total: row.get(16)?, status: row.get(17)?, protocolo: row.get(18)?,
            observacoes: row.get(19)?,
        })
    );
    
    match result {
        Ok(nfe) => Ok(Some(nfe)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

#[tauri::command]
pub async fn cancelar_nfe(
    app: AppHandle,
    id: i64,
    justificativa: String,
) -> Result<bool, AppError> {
    if justificativa.len() < 15 {
        return Err(AppError::Validation("Justificativa deve ter no mínimo 15 caracteres".into()));
    }
    
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute(
        "UPDATE notas_fiscais SET status = 'cancelada', observacoes = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![justificativa, id],
    )?;
    
    info!("❌ NFe cancelada: ID {}", id);
    
    Ok(true)
}

#[tauri::command]
pub async fn gerar_danfe(app: AppHandle, id: i64) -> Result<String, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    // Buscar dados da NFe
    let nfe: NotaFiscal = conn.query_row(
        "SELECT nf.id, nf.numero, nf.serie, nf.chave, nf.tipo, nf.natureza_operacao,
                nf.data_emissao, nf.data_saida, nf.cliente_id, c.nome, nf.fornecedor_id,
                nf.pedido_id, nf.valor_produtos, nf.valor_frete, nf.valor_seguro,
                nf.valor_desconto, nf.valor_total, nf.status, nf.protocolo, nf.observacoes
         FROM notas_fiscais nf
         LEFT JOIN clientes c ON c.id = nf.cliente_id
         WHERE nf.id = ?1",
        params![id],
        |row| Ok(NotaFiscal {
            id: row.get(0)?, numero: row.get(1)?, serie: row.get(2)?, chave: row.get(3)?,
            tipo: row.get(4)?, natureza_operacao: row.get(5)?, data_emissao: row.get(6)?,
            data_saida: row.get(7)?, cliente_id: row.get(8)?, cliente_nome: row.get(9)?,
            fornecedor_id: row.get(10)?, pedido_id: row.get(11)?, valor_produtos: row.get(12)?,
            valor_frete: row.get(13)?, valor_seguro: row.get(14)?, valor_desconto: row.get(15)?,
            valor_total: row.get(16)?, status: row.get(17)?, protocolo: row.get(18)?,
            observacoes: row.get(19)?,
        })
    )?;
    
    // Em uma implementação real, geraria o PDF do DANFE
    // Aqui retornamos um placeholder com as informações básicas
    let danfe_info = format!(
        "DANFE - Nota Fiscal Eletrônica\n\
         Número: {}\n\
         Série: {}\n\
         Chave: {}\n\
         Cliente: {}\n\
         Valor Total: R$ {:.2}\n\
         Status: {}",
        nfe.numero.unwrap_or_default(),
        nfe.serie.unwrap_or_default(),
        nfe.chave.unwrap_or_default(),
        nfe.cliente_nome.unwrap_or_default(),
        nfe.valor_total,
        nfe.status
    );
    
    Ok(danfe_info)
}
