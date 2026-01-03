//! Módulo de banco de dados SQLite
//! 
//! Gerencia conexões, migrations e operações com o banco local.

use rusqlite::{Connection, params};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;
use log::info;

use crate::error::{AppError, AppResult};

/// Estado global do banco de dados
pub struct DatabaseState {
    pub connection: Mutex<Option<Connection>>,
}

impl Default for DatabaseState {
    fn default() -> Self {
        Self {
            connection: Mutex::new(None),
        }
    }
}

/// Obtém o caminho do banco de dados
pub fn get_database_path(app: &AppHandle) -> AppResult<PathBuf> {
    let app_data = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Erro ao obter diretório de dados: {}", e)))?;
    
    std::fs::create_dir_all(&app_data)?;
    
    Ok(app_data.join("aluforce.db"))
}

/// Inicializa o banco de dados
pub async fn init(app: &AppHandle) -> AppResult<()> {
    let db_path = get_database_path(app)?;
    
    info!("📂 Inicializando banco de dados em: {:?}", db_path);
    
    let conn = Connection::open(&db_path)?;
    
    // Configurações de performance
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA cache_size = 10000;
         PRAGMA temp_store = MEMORY;
         PRAGMA foreign_keys = ON;"
    )?;
    
    // Criar tabelas
    create_tables(&conn)?;
    
    // Inserir dados iniciais
    seed_initial_data(&conn)?;
    
    info!("✅ Banco de dados inicializado com sucesso!");
    
    Ok(())
}

/// Cria todas as tabelas necessárias
fn create_tables(conn: &Connection) -> AppResult<()> {
    info!("📋 Criando tabelas...");
    
    // Tabela de usuários
    conn.execute(
        "CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha_hash TEXT NOT NULL,
            cargo TEXT,
            departamento TEXT,
            avatar TEXT,
            ativo INTEGER DEFAULT 1,
            permissoes TEXT DEFAULT '{}',
            ultimo_acesso TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )",
        [],
    )?;
    
    // Tabela de sessões
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sessoes (
            id TEXT PRIMARY KEY,
            usuario_id INTEGER NOT NULL,
            token TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )",
        [],
    )?;
    
    // Tabela de empresas
    conn.execute(
        "CREATE TABLE IF NOT EXISTS empresas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            razao_social TEXT NOT NULL,
            nome_fantasia TEXT,
            cnpj TEXT UNIQUE,
            inscricao_estadual TEXT,
            inscricao_municipal TEXT,
            telefone TEXT,
            email TEXT,
            cep TEXT,
            endereco TEXT,
            numero TEXT,
            complemento TEXT,
            bairro TEXT,
            cidade TEXT,
            estado TEXT,
            logo_path TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )",
        [],
    )?;
    
    // Tabela de clientes
    conn.execute(
        "CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            razao_social TEXT,
            nome_fantasia TEXT,
            cnpj TEXT,
            cpf TEXT,
            inscricao_estadual TEXT,
            inscricao_municipal TEXT,
            email TEXT,
            telefone TEXT,
            celular TEXT,
            cep TEXT,
            endereco TEXT,
            numero TEXT,
            complemento TEXT,
            bairro TEXT,
            cidade TEXT,
            estado TEXT,
            observacoes TEXT,
            limite_credito REAL DEFAULT 0,
            vendedor_id INTEGER,
            ativo INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )",
        [],
    )?;
    
    // Tabela de fornecedores
    conn.execute(
        "CREATE TABLE IF NOT EXISTS fornecedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            razao_social TEXT,
            nome_fantasia TEXT,
            cnpj TEXT,
            cpf TEXT,
            inscricao_estadual TEXT,
            email TEXT,
            telefone TEXT,
            cep TEXT,
            endereco TEXT,
            numero TEXT,
            bairro TEXT,
            cidade TEXT,
            estado TEXT,
            observacoes TEXT,
            ativo INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )",
        [],
    )?;
    
    // Tabela de produtos
    conn.execute(
        "CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE,
            nome TEXT NOT NULL,
            descricao TEXT,
            categoria TEXT,
            unidade TEXT DEFAULT 'UN',
            preco_custo REAL DEFAULT 0,
            preco_venda REAL DEFAULT 0,
            margem REAL DEFAULT 0,
            estoque_minimo REAL DEFAULT 0,
            estoque_atual REAL DEFAULT 0,
            ncm TEXT,
            cest TEXT,
            origem TEXT,
            cfop TEXT,
            cst_icms TEXT,
            cst_pis TEXT,
            cst_cofins TEXT,
            ativo INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )",
        [],
    )?;
    
    // Tabela de pedidos de venda
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pedidos_venda (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT UNIQUE,
            cliente_id INTEGER,
            vendedor_id INTEGER,
            data_pedido TEXT,
            data_entrega TEXT,
            status TEXT DEFAULT 'orcamento',
            subtotal REAL DEFAULT 0,
            desconto REAL DEFAULT 0,
            acrescimo REAL DEFAULT 0,
            total REAL DEFAULT 0,
            forma_pagamento TEXT,
            condicao_pagamento TEXT,
            observacoes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
        )",
        [],
    )?;
    
    // Tabela de itens de pedido
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pedido_itens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL,
            produto_id INTEGER NOT NULL,
            quantidade REAL DEFAULT 1,
            preco_unitario REAL DEFAULT 0,
            desconto REAL DEFAULT 0,
            total REAL DEFAULT 0,
            FOREIGN KEY (pedido_id) REFERENCES pedidos_venda(id) ON DELETE CASCADE,
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        )",
        [],
    )?;
    
    // Tabela de contas a pagar
    conn.execute(
        "CREATE TABLE IF NOT EXISTS contas_pagar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            descricao TEXT NOT NULL,
            fornecedor_id INTEGER,
            valor REAL NOT NULL,
            data_vencimento TEXT NOT NULL,
            data_pagamento TEXT,
            status TEXT DEFAULT 'pendente',
            categoria TEXT,
            forma_pagamento TEXT,
            observacoes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
        )",
        [],
    )?;
    
    // Tabela de contas a receber
    conn.execute(
        "CREATE TABLE IF NOT EXISTS contas_receber (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            descricao TEXT NOT NULL,
            cliente_id INTEGER,
            pedido_id INTEGER,
            valor REAL NOT NULL,
            data_vencimento TEXT NOT NULL,
            data_recebimento TEXT,
            status TEXT DEFAULT 'pendente',
            categoria TEXT,
            forma_recebimento TEXT,
            observacoes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (pedido_id) REFERENCES pedidos_venda(id)
        )",
        [],
    )?;
    
    // Tabela de contas bancárias
    conn.execute(
        "CREATE TABLE IF NOT EXISTS contas_bancarias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            banco TEXT,
            agencia TEXT,
            conta TEXT,
            tipo TEXT DEFAULT 'corrente',
            saldo_inicial REAL DEFAULT 0,
            saldo_atual REAL DEFAULT 0,
            ativo INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )",
        [],
    )?;
    
    // Tabela de funcionários
    conn.execute(
        "CREATE TABLE IF NOT EXISTS funcionarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            nome TEXT NOT NULL,
            cpf TEXT UNIQUE,
            rg TEXT,
            data_nascimento TEXT,
            data_admissao TEXT,
            data_demissao TEXT,
            cargo TEXT,
            departamento TEXT,
            salario REAL DEFAULT 0,
            email TEXT,
            telefone TEXT,
            cep TEXT,
            endereco TEXT,
            numero TEXT,
            bairro TEXT,
            cidade TEXT,
            estado TEXT,
            ativo INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )",
        [],
    )?;
    
    // Tabela de controle de ponto
    conn.execute(
        "CREATE TABLE IF NOT EXISTS controle_ponto (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            funcionario_id INTEGER NOT NULL,
            data TEXT NOT NULL,
            entrada TEXT,
            saida_almoco TEXT,
            retorno_almoco TEXT,
            saida TEXT,
            horas_trabalhadas REAL DEFAULT 0,
            observacoes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
        )",
        [],
    )?;
    
    // Tabela de ordens de produção
    conn.execute(
        "CREATE TABLE IF NOT EXISTS ordens_producao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT UNIQUE,
            produto_id INTEGER,
            quantidade REAL DEFAULT 1,
            data_inicio TEXT,
            data_prevista TEXT,
            data_conclusao TEXT,
            status TEXT DEFAULT 'planejada',
            prioridade TEXT DEFAULT 'normal',
            responsavel_id INTEGER,
            observacoes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (produto_id) REFERENCES produtos(id),
            FOREIGN KEY (responsavel_id) REFERENCES funcionarios(id)
        )",
        [],
    )?;
    
    // Tabela de notas fiscais
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notas_fiscais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT,
            serie TEXT,
            chave TEXT UNIQUE,
            tipo TEXT DEFAULT 'saida',
            natureza_operacao TEXT,
            data_emissao TEXT,
            data_saida TEXT,
            cliente_id INTEGER,
            fornecedor_id INTEGER,
            pedido_id INTEGER,
            valor_produtos REAL DEFAULT 0,
            valor_frete REAL DEFAULT 0,
            valor_seguro REAL DEFAULT 0,
            valor_desconto REAL DEFAULT 0,
            valor_total REAL DEFAULT 0,
            status TEXT DEFAULT 'pendente',
            xml TEXT,
            protocolo TEXT,
            observacoes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
            FOREIGN KEY (pedido_id) REFERENCES pedidos_venda(id)
        )",
        [],
    )?;
    
    // Tabela de configurações
    conn.execute(
        "CREATE TABLE IF NOT EXISTS configuracoes (
            chave TEXT PRIMARY KEY,
            valor TEXT,
            tipo TEXT DEFAULT 'string',
            updated_at TEXT DEFAULT (datetime('now'))
        )",
        [],
    )?;
    
    // Índices para performance
    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
         CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON clientes(cnpj);
         CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo);
         CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
         CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos_venda(numero);
         CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos_venda(cliente_id);
         CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
         CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON contas_receber(data_vencimento);
         CREATE INDEX IF NOT EXISTS idx_funcionarios_cpf ON funcionarios(cpf);
         CREATE INDEX IF NOT EXISTS idx_nf_chave ON notas_fiscais(chave);"
    )?;
    
    info!("✅ Tabelas criadas com sucesso!");
    
    Ok(())
}

/// Insere dados iniciais no banco
fn seed_initial_data(conn: &Connection) -> AppResult<()> {
    // Verificar se já existe usuário admin
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM usuarios WHERE email = 'admin@aluforce.com.br'",
        [],
        |row| row.get(0),
    ).unwrap_or(0);
    
    if count == 0 {
        info!("🌱 Inserindo dados iniciais...");
        
        // Hash da senha 'admin123'
        let senha_hash = bcrypt::hash("admin123", bcrypt::DEFAULT_COST)?;
        
        // Criar usuário admin
        conn.execute(
            "INSERT INTO usuarios (nome, email, senha_hash, cargo, departamento, permissoes) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                "Administrador",
                "admin@aluforce.com.br",
                senha_hash,
                "Administrador",
                "TI",
                r#"{"admin": true, "all": true}"#
            ],
        )?;
        
        // Criar empresa padrão
        conn.execute(
            "INSERT INTO empresas (razao_social, nome_fantasia, cnpj) 
             VALUES (?1, ?2, ?3)",
            params![
                "ALUFORCE LTDA",
                "ALUFORCE",
                "00.000.000/0001-00"
            ],
        )?;
        
        info!("✅ Dados iniciais inseridos!");
    }
    
    Ok(())
}

/// Executa backup do banco de dados
pub async fn backup(app: &AppHandle, backup_path: &str) -> AppResult<()> {
    let db_path = get_database_path(app)?;
    
    std::fs::copy(&db_path, backup_path)?;
    
    info!("💾 Backup realizado em: {}", backup_path);
    
    Ok(())
}

/// Restaura banco de dados de backup
pub async fn restore(app: &AppHandle, backup_path: &str) -> AppResult<()> {
    let db_path = get_database_path(app)?;
    
    // Verificar se backup existe
    if !std::path::Path::new(backup_path).exists() {
        return Err(AppError::NotFound("Arquivo de backup não encontrado".into()));
    }
    
    std::fs::copy(backup_path, &db_path)?;
    
    info!("🔄 Banco restaurado de: {}", backup_path);
    
    Ok(())
}
