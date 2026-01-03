//! Comandos de RH (Recursos Humanos)

use tauri::AppHandle;
use rusqlite::{Connection, params};
use log::info;

use crate::error::AppError;
use crate::models::{Funcionario, RegistroPonto, PaginatedResponse};
use crate::database::get_database_path;

#[tauri::command]
pub async fn get_funcionarios(
    app: AppHandle,
    page: Option<i64>,
    per_page: Option<i64>,
    ativo: Option<bool>,
) -> Result<PaginatedResponse<Funcionario>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let page = page.unwrap_or(1);
    let per_page = per_page.unwrap_or(20);
    let offset = (page - 1) * per_page;
    let ativo_filter = ativo.unwrap_or(true);
    
    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM funcionarios WHERE ativo = ?1",
        params![ativo_filter], |row| row.get(0)
    )?;
    
    let mut stmt = conn.prepare(
        "SELECT id, usuario_id, nome, cpf, rg, data_nascimento, data_admissao, data_demissao,
                cargo, departamento, salario, email, telefone, cep, endereco, numero,
                bairro, cidade, estado, ativo
         FROM funcionarios WHERE ativo = ?1
         ORDER BY nome ASC LIMIT ?2 OFFSET ?3"
    )?;
    
    let funcionarios: Vec<Funcionario> = stmt.query_map(params![ativo_filter, per_page, offset], |row| {
        Ok(Funcionario {
            id: row.get(0)?, usuario_id: row.get(1)?, nome: row.get(2)?, cpf: row.get(3)?,
            rg: row.get(4)?, data_nascimento: row.get(5)?, data_admissao: row.get(6)?,
            data_demissao: row.get(7)?, cargo: row.get(8)?, departamento: row.get(9)?,
            salario: row.get(10)?, email: row.get(11)?, telefone: row.get(12)?,
            cep: row.get(13)?, endereco: row.get(14)?, numero: row.get(15)?,
            bairro: row.get(16)?, cidade: row.get(17)?, estado: row.get(18)?,
            ativo: row.get(19)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    
    Ok(PaginatedResponse::new(funcionarios, total, page, per_page))
}

#[tauri::command]
pub async fn get_funcionario_by_id(app: AppHandle, id: i64) -> Result<Option<Funcionario>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let result = conn.query_row(
        "SELECT id, usuario_id, nome, cpf, rg, data_nascimento, data_admissao, data_demissao,
                cargo, departamento, salario, email, telefone, cep, endereco, numero,
                bairro, cidade, estado, ativo
         FROM funcionarios WHERE id = ?1",
        params![id],
        |row| Ok(Funcionario {
            id: row.get(0)?, usuario_id: row.get(1)?, nome: row.get(2)?, cpf: row.get(3)?,
            rg: row.get(4)?, data_nascimento: row.get(5)?, data_admissao: row.get(6)?,
            data_demissao: row.get(7)?, cargo: row.get(8)?, departamento: row.get(9)?,
            salario: row.get(10)?, email: row.get(11)?, telefone: row.get(12)?,
            cep: row.get(13)?, endereco: row.get(14)?, numero: row.get(15)?,
            bairro: row.get(16)?, cidade: row.get(17)?, estado: row.get(18)?,
            ativo: row.get(19)?,
        }),
    );
    
    match result {
        Ok(f) => Ok(Some(f)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

#[tauri::command]
pub async fn create_funcionario(
    app: AppHandle,
    nome: String,
    cpf: Option<String>,
    cargo: Option<String>,
    departamento: Option<String>,
    data_admissao: Option<String>,
    salario: Option<f64>,
    email: Option<String>,
    telefone: Option<String>,
) -> Result<Funcionario, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute(
        "INSERT INTO funcionarios (nome, cpf, cargo, departamento, data_admissao, salario, email, telefone)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![nome, cpf, cargo, departamento, data_admissao, salario.unwrap_or(0.0), email, telefone],
    )?;
    
    let id = conn.last_insert_rowid();
    info!("✅ Funcionário criado: {} (ID: {})", nome, id);
    
    get_funcionario_by_id(app, id).await?.ok_or(AppError::NotFound("Funcionário não encontrado".into()))
}

#[tauri::command]
pub async fn update_funcionario(
    app: AppHandle,
    id: i64,
    nome: String,
    cpf: Option<String>,
    cargo: Option<String>,
    departamento: Option<String>,
    salario: Option<f64>,
    email: Option<String>,
    telefone: Option<String>,
) -> Result<Funcionario, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    conn.execute(
        "UPDATE funcionarios SET nome = ?1, cpf = ?2, cargo = ?3, departamento = ?4,
         salario = ?5, email = ?6, telefone = ?7, updated_at = datetime('now')
         WHERE id = ?8",
        params![nome, cpf, cargo, departamento, salario.unwrap_or(0.0), email, telefone, id],
    )?;
    
    get_funcionario_by_id(app, id).await?.ok_or(AppError::NotFound("Funcionário não encontrado".into()))
}

#[tauri::command]
pub async fn get_controle_ponto(
    app: AppHandle,
    funcionario_id: Option<i64>,
    data_inicio: Option<String>,
    data_fim: Option<String>,
) -> Result<Vec<RegistroPonto>, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let registros = if let Some(fid) = funcionario_id {
        let mut stmt = conn.prepare(
            "SELECT cp.id, cp.funcionario_id, f.nome, cp.data, cp.entrada, cp.saida_almoco,
                    cp.retorno_almoco, cp.saida, cp.horas_trabalhadas, cp.observacoes
             FROM controle_ponto cp
             LEFT JOIN funcionarios f ON f.id = cp.funcionario_id
             WHERE cp.funcionario_id = ?1
             ORDER BY cp.data DESC LIMIT 100"
        )?;
        
        let result: Vec<RegistroPonto> = stmt.query_map(params![fid], |row| {
            Ok(RegistroPonto {
                id: row.get(0)?, funcionario_id: row.get(1)?, funcionario_nome: row.get(2)?,
                data: row.get(3)?, entrada: row.get(4)?, saida_almoco: row.get(5)?,
                retorno_almoco: row.get(6)?, saida: row.get(7)?, horas_trabalhadas: row.get(8)?,
                observacoes: row.get(9)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        result
    } else {
        let mut stmt = conn.prepare(
            "SELECT cp.id, cp.funcionario_id, f.nome, cp.data, cp.entrada, cp.saida_almoco,
                    cp.retorno_almoco, cp.saida, cp.horas_trabalhadas, cp.observacoes
             FROM controle_ponto cp
             LEFT JOIN funcionarios f ON f.id = cp.funcionario_id
             ORDER BY cp.data DESC LIMIT 100"
        )?;
        
        let result: Vec<RegistroPonto> = stmt.query_map([], |row| {
            Ok(RegistroPonto {
                id: row.get(0)?, funcionario_id: row.get(1)?, funcionario_nome: row.get(2)?,
                data: row.get(3)?, entrada: row.get(4)?, saida_almoco: row.get(5)?,
                retorno_almoco: row.get(6)?, saida: row.get(7)?, horas_trabalhadas: row.get(8)?,
                observacoes: row.get(9)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        result
    };
    
    Ok(registros)
}

#[tauri::command]
pub async fn registrar_ponto(
    app: AppHandle,
    funcionario_id: i64,
    tipo: String, // 'entrada', 'saida_almoco', 'retorno_almoco', 'saida'
) -> Result<RegistroPonto, AppError> {
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    let hoje = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let hora = chrono::Utc::now().format("%H:%M:%S").to_string();
    
    // Verificar se já existe registro para hoje
    let existe: i64 = conn.query_row(
        "SELECT COUNT(*) FROM controle_ponto WHERE funcionario_id = ?1 AND data = ?2",
        params![funcionario_id, hoje], |row| row.get(0)
    ).unwrap_or(0);
    
    if existe == 0 && tipo == "entrada" {
        // Criar novo registro
        conn.execute(
            "INSERT INTO controle_ponto (funcionario_id, data, entrada) VALUES (?1, ?2, ?3)",
            params![funcionario_id, hoje, hora],
        )?;
    } else if existe > 0 {
        // Atualizar registro existente
        let campo = match tipo.as_str() {
            "entrada" => "entrada",
            "saida_almoco" => "saida_almoco",
            "retorno_almoco" => "retorno_almoco",
            "saida" => "saida",
            _ => return Err(AppError::Validation("Tipo de ponto inválido".into())),
        };
        
        conn.execute(
            &format!("UPDATE controle_ponto SET {} = ?1 WHERE funcionario_id = ?2 AND data = ?3", campo),
            params![hora, funcionario_id, hoje],
        )?;
    } else {
        return Err(AppError::Validation("Registre a entrada primeiro".into()));
    }
    
    info!("✅ Ponto registrado: {} - {} às {}", funcionario_id, tipo, hora);
    
    // Retornar registro
    let registro = conn.query_row(
        "SELECT cp.id, cp.funcionario_id, f.nome, cp.data, cp.entrada, cp.saida_almoco,
                cp.retorno_almoco, cp.saida, cp.horas_trabalhadas, cp.observacoes
         FROM controle_ponto cp
         LEFT JOIN funcionarios f ON f.id = cp.funcionario_id
         WHERE cp.funcionario_id = ?1 AND cp.data = ?2",
        params![funcionario_id, hoje],
        |row| Ok(RegistroPonto {
            id: row.get(0)?, funcionario_id: row.get(1)?, funcionario_nome: row.get(2)?,
            data: row.get(3)?, entrada: row.get(4)?, saida_almoco: row.get(5)?,
            retorno_almoco: row.get(6)?, saida: row.get(7)?, horas_trabalhadas: row.get(8)?,
            observacoes: row.get(9)?,
        })
    )?;
    
    Ok(registro)
}
