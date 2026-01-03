//! Comandos do Sistema

use tauri::AppHandle;
use log::info;

use crate::error::AppError;
use crate::models::AppInfo;

#[tauri::command]
pub async fn get_app_info() -> Result<AppInfo, AppError> {
    Ok(AppInfo {
        name: "ALUFORCE".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        tauri_version: tauri::VERSION.to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    })
}

#[tauri::command]
pub async fn check_updates() -> Result<Option<String>, AppError> {
    // Em uma implementação real, verificaria atualizações em um servidor
    // Por enquanto, retorna None (sem atualizações)
    Ok(None)
}

#[tauri::command]
pub async fn export_data(
    app: AppHandle,
    tabela: String,
    formato: String, // 'json' ou 'csv'
) -> Result<String, AppError> {
    use crate::database::get_database_path;
    use rusqlite::Connection;
    
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    // Validar tabela (prevenir SQL injection)
    let tabelas_permitidas = vec![
        "clientes", "fornecedores", "produtos", "pedidos_venda", 
        "contas_pagar", "contas_receber", "funcionarios", "notas_fiscais"
    ];
    
    if !tabelas_permitidas.contains(&tabela.as_str()) {
        return Err(AppError::Validation(format!("Tabela '{}' não permitida para exportação", tabela)));
    }
    
    let mut stmt = conn.prepare(&format!("SELECT * FROM {} LIMIT 10000", tabela))?;
    let column_count = stmt.column_count();
    let column_names: Vec<String> = (0..column_count)
        .map(|i| stmt.column_name(i).unwrap_or("").to_string())
        .collect();
    
    let rows: Vec<Vec<String>> = stmt.query_map([], |row| {
        let mut values = Vec::new();
        for i in 0..column_count {
            let value: String = row.get::<_, Option<String>>(i)?.unwrap_or_default();
            values.push(value);
        }
        Ok(values)
    })?.filter_map(|r| r.ok()).collect();
    
    let row_count = rows.len();
    
    let result = if formato == "csv" {
        let mut csv = column_names.join(",") + "\n";
        for row in &rows {
            csv += &row.iter()
                .map(|v| format!("\"{}\"", v.replace("\"", "\"\"")))
                .collect::<Vec<_>>()
                .join(",");
            csv += "\n";
        }
        csv
    } else {
        let json_rows: Vec<serde_json::Value> = rows.iter().map(|row| {
            let mut obj = serde_json::Map::new();
            for (i, name) in column_names.iter().enumerate() {
                obj.insert(name.clone(), serde_json::Value::String(row.get(i).cloned().unwrap_or_default()));
            }
            serde_json::Value::Object(obj)
        }).collect();
        
        serde_json::to_string_pretty(&json_rows)?
    };
    
    info!("📤 Dados exportados: {} ({} registros)", tabela, row_count);
    
    Ok(result)
}

#[tauri::command]
pub async fn import_data(
    app: AppHandle,
    tabela: String,
    dados: String,
    formato: String,
) -> Result<i64, AppError> {
    use crate::database::get_database_path;
    use rusqlite::Connection;
    
    let db_path = get_database_path(&app)?;
    let conn = Connection::open(&db_path)?;
    
    // Validar tabela
    let tabelas_permitidas = vec!["clientes", "fornecedores", "produtos"];
    
    if !tabelas_permitidas.contains(&tabela.as_str()) {
        return Err(AppError::Validation(format!("Tabela '{}' não permitida para importação", tabela)));
    }
    
    let mut count = 0i64;
    
    if formato == "json" {
        let registros: Vec<serde_json::Value> = serde_json::from_str(&dados)?;
        
        for registro in registros {
            if let serde_json::Value::Object(obj) = registro {
                // Construir INSERT dinâmico
                let columns: Vec<&str> = obj.keys().map(|k| k.as_str()).collect();
                let values: Vec<String> = obj.values().map(|v| {
                    match v {
                        serde_json::Value::String(s) => s.clone(),
                        serde_json::Value::Number(n) => n.to_string(),
                        serde_json::Value::Bool(b) => if *b { "1" } else { "0" }.to_string(),
                        serde_json::Value::Null => "".to_string(),
                        _ => v.to_string(),
                    }
                }).collect();
                
                if !columns.is_empty() {
                    let placeholders: Vec<&str> = (0..columns.len()).map(|_| "?").collect();
                    let sql = format!(
                        "INSERT OR IGNORE INTO {} ({}) VALUES ({})",
                        tabela,
                        columns.join(", "),
                        placeholders.join(", ")
                    );
                    
                    let params: Vec<&dyn rusqlite::ToSql> = values.iter()
                        .map(|v| v as &dyn rusqlite::ToSql)
                        .collect();
                    
                    if conn.execute(&sql, params.as_slice()).is_ok() {
                        count += 1;
                    }
                }
            }
        }
    }
    
    info!("📥 Dados importados: {} ({} registros)", tabela, count);
    
    Ok(count)
}
