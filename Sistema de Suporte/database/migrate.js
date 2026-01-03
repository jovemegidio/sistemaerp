/**
 * Script de migração para o Sistema de Suporte
 * Cria as tabelas necessárias no banco de dados
 */

const mysql = require('mysql2/promise');

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '@dminalu',
        database: process.env.DB_NAME || 'aluforce_vendas',
        port: process.env.DB_PORT || 3306
    });

    console.log('🔄 Iniciando migração do Sistema de Suporte...\n');

    try {
        // Tabela de Tickets
        console.log('📋 Criando tabela suporte_tickets...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS suporte_tickets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                protocolo VARCHAR(20) NOT NULL UNIQUE,
                cliente_id INT NULL,
                cliente_nome VARCHAR(255) NOT NULL,
                cliente_email VARCHAR(255) NULL,
                assunto VARCHAR(255) NULL,
                categoria VARCHAR(100) NULL,
                status ENUM('ai_handling', 'waiting_human', 'in_progress', 'closed') DEFAULT 'ai_handling',
                prioridade ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
                atendente_id INT NULL,
                atendente_nome VARCHAR(255) NULL,
                socket_id VARCHAR(100) NULL,
                resolucao TEXT NULL,
                avaliacao INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                closed_at TIMESTAMP NULL,
                INDEX idx_status (status),
                INDEX idx_atendente (atendente_id),
                INDEX idx_cliente (cliente_id),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ Tabela suporte_tickets criada/verificada');

        // Tabela de Mensagens
        console.log('📋 Criando tabela suporte_mensagens...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS suporte_mensagens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id INT NOT NULL,
                sender_type ENUM('client', 'admin', 'ai', 'system') NOT NULL,
                sender_name VARCHAR(255) NOT NULL,
                sender_id INT NULL,
                mensagem TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES suporte_tickets(id) ON DELETE CASCADE,
                INDEX idx_ticket (ticket_id),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ Tabela suporte_mensagens criada/verificada');

        // Tabela de Base de Conhecimento
        console.log('📋 Criando tabela suporte_base_conhecimento...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS suporte_base_conhecimento (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pergunta TEXT NOT NULL,
                resposta TEXT NOT NULL,
                palavras_chave TEXT NULL,
                categoria VARCHAR(100) NULL,
                visualizacoes INT DEFAULT 0,
                ativo TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_categoria (categoria),
                INDEX idx_ativo (ativo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ Tabela suporte_base_conhecimento criada/verificada');

        // Tabela de Artigos
        console.log('📋 Criando tabela suporte_artigos...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS suporte_artigos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                titulo VARCHAR(255) NOT NULL,
                conteudo TEXT NOT NULL,
                categoria VARCHAR(100) NULL,
                colecao VARCHAR(100) NULL,
                visualizacoes INT DEFAULT 0,
                ativo TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_categoria (categoria),
                INDEX idx_colecao (colecao),
                INDEX idx_ativo (ativo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✅ Tabela suporte_artigos criada/verificada');

        console.log('\n✅ Migração concluída com sucesso!');
        
        // Verificar se há dados na base de conhecimento
        const [[{ count }]] = await pool.execute('SELECT COUNT(*) as count FROM suporte_base_conhecimento');
        if (count === 0) {
            console.log('\n📚 Base de conhecimento vazia. Execute "node seed.js" para popular.');
        } else {
            console.log(`\n📚 Base de conhecimento contém ${count} registros.`);
        }

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Erro na migração:', error.message);
        await pool.end();
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    migrate();
}

module.exports = { migrate };
