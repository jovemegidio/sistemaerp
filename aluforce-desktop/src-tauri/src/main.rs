//! ALUFORCE Desktop - Sistema de Gestão Empresarial
//! 
//! Backend Rust com Tauri para aplicação desktop enterprise-grade.
//! Inclui gerenciamento de banco SQLite, autenticação segura e
//! integração com módulos de Vendas, Compras, Financeiro, PCP, RH e NFe.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod models;
mod error;

use tauri::Manager;
use log::info;

/// Função principal - Entry point da aplicação Tauri
fn main() {
    // Inicializar logger
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    
    info!("🚀 Iniciando ALUFORCE Desktop v2.5.0");

    let mut builder = tauri::Builder::default()
        // Plugins
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::default().build());
        
    // Single instance (apenas uma instância da aplicação) - desktop only
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Focar na janela principal quando tentar abrir outra instância
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }));
    }
        
    builder
        // Comandos Rust expostos ao frontend
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            commands::auth::login,
            commands::auth::logout,
            commands::auth::get_current_user,
            commands::auth::change_password,
            commands::auth::validate_session,
            
            // Database commands
            commands::database::init_database,
            commands::database::backup_database,
            commands::database::restore_database,
            commands::database::execute_query,
            
            // Clientes commands
            commands::clientes::get_clientes,
            commands::clientes::get_cliente_by_id,
            commands::clientes::create_cliente,
            commands::clientes::update_cliente,
            commands::clientes::delete_cliente,
            commands::clientes::search_clientes,
            
            // Fornecedores commands  
            commands::fornecedores::get_fornecedores,
            commands::fornecedores::get_fornecedor_by_id,
            commands::fornecedores::create_fornecedor,
            commands::fornecedores::update_fornecedor,
            commands::fornecedores::delete_fornecedor,
            
            // Produtos commands
            commands::produtos::get_produtos,
            commands::produtos::get_produto_by_id,
            commands::produtos::create_produto,
            commands::produtos::update_produto,
            commands::produtos::delete_produto,
            commands::produtos::search_produtos,
            
            // Pedidos/Vendas commands
            commands::vendas::get_pedidos,
            commands::vendas::get_pedido_by_id,
            commands::vendas::create_pedido,
            commands::vendas::update_pedido,
            commands::vendas::delete_pedido,
            commands::vendas::get_dashboard_vendas,
            
            // Compras commands
            commands::compras::get_requisicoes,
            commands::compras::create_requisicao,
            commands::compras::get_cotacoes,
            commands::compras::create_cotacao,
            commands::compras::get_pedidos_compra,
            commands::compras::create_pedido_compra,
            
            // Financeiro commands
            commands::financeiro::get_contas_pagar,
            commands::financeiro::get_contas_receber,
            commands::financeiro::get_contas_bancarias,
            commands::financeiro::create_lancamento,
            commands::financeiro::get_fluxo_caixa,
            commands::financeiro::get_dashboard_financeiro,
            
            // PCP commands
            commands::pcp::get_ordens_producao,
            commands::pcp::create_ordem_producao,
            commands::pcp::update_ordem_producao,
            commands::pcp::get_estoque,
            commands::pcp::atualizar_estoque,
            
            // RH commands
            commands::rh::get_funcionarios,
            commands::rh::get_funcionario_by_id,
            commands::rh::create_funcionario,
            commands::rh::update_funcionario,
            commands::rh::get_controle_ponto,
            commands::rh::registrar_ponto,
            
            // NFe commands
            commands::nfe::emitir_nfe,
            commands::nfe::consultar_nfe,
            commands::nfe::cancelar_nfe,
            commands::nfe::get_nfes,
            commands::nfe::gerar_danfe,
            
            // Config commands
            commands::config::get_config,
            commands::config::save_config,
            commands::config::get_empresa,
            commands::config::save_empresa,
            
            // System commands
            commands::system::get_app_info,
            commands::system::check_updates,
            commands::system::export_data,
            commands::system::import_data,
        ])
        
        // Setup
        .setup(|app| {
            info!("📦 Configurando aplicação...");
            
            // Inicializar banco de dados
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = database::init(&app_handle).await {
                    log::error!("Erro ao inicializar banco de dados: {}", e);
                }
            });
            
            // Mostrar janela principal após carregamento
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            
            info!("✅ Aplicação configurada com sucesso!");
            Ok(())
        })
        
        .run(tauri::generate_context!())
        .expect("Erro ao executar aplicação Tauri");
}
