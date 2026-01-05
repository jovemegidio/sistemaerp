// Script para popular as tabelas vendedores e compraçãores com dados reais
const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '@dminalu',
    database: 'aluforce_vendas'
};

async function popularTabelas() {
    const pool = mysql.createPool(DB_CONFIG);
    
    try {
        console.log('🔄 Criando tabelas se não existirem...');
        
        // Criar tabela vendedores se não existir
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vendedores (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                comissao DECIMAL(5,2) DEFAULT 0,
                permissoes TEXT,
                situacao ENUM('ativo', 'inativo') DEFAULT 'ativo',
                usuario_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        // Criar tabela compraçãores se não existir
        await pool.query(`
            CREATE TABLE IF NOT EXISTS compraçãores (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(255) NOT NULL,
                situacao ENUM('ativo', 'inativo') DEFAULT 'ativo',
                incluido_por VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        // ============ VENDEDORES (Equipe Comercial) ============
        console.log('\n📊 Populando tabela VENDEDORES...');
        
        // Limpar tabela vendedores
        await pool.query('DELETE FROM vendedores');
        
        // Equipe comercial completa conforme permissions.js
        const vendedores = [
            { nome: 'Ariel', email: 'ariel@aluforce.com.br', comissao: 3.00 },
            { nome: 'Thaina', email: 'thaina@aluforce.com.br', comissao: 3.00 },
            { nome: 'Augusto', email: 'augusto@aluforce.com.br', comissao: 3.00 },
            { nome: 'Marcia', email: 'marcia@aluforce.com.br', comissao: 3.00 },
            { nome: 'Fabiano', email: 'fabiano@aluforce.com.br', comissao: 3.00 },
            { nome: 'Fabiola', email: 'fabiola@aluforce.com.br', comissao: 3.00 },
            { nome: 'Renata', email: 'renata@aluforce.com.br', comissao: 3.00 },
            { nome: 'Nicolas', email: 'nicolas@aluforce.com.br', comissao: 3.00 },
            { nome: 'Lais', email: 'lais@aluforce.com.br', comissao: 3.00 },
            { nome: 'Marcos', email: 'marcos@aluforce.com.br', comissao: 3.00 },
            { nome: 'Isabela', email: 'isabela@aluforce.com.br', comissao: 3.00 },
            { nome: 'Andréia Trovão', email: 'andreia@aluforce.com.br', comissao: 3.00 }
        ];
        
        for (const v of vendedores) {
            await pool.query(
                'INSERT INTO vendedores (nome, email, comissao, situacao, permissoes) VALUES (?, ?, ?, ?, )',
                [v.nome, v.email, v.comissao, 'ativo', 'vendas,crm']
            );
            console.log(`   ✅ Vendedor adicionação: ${v.nome}`);
        }
        
        // ============ COMPRADORES ============
        console.log('\n🛒 Populando tabela COMPRADORES...');
        
        // Limpar tabela compraçãores
        await pool.query('DELETE FROM compraçãores');
        
        // Compraçãores com "Antônio Egidio Neto" como incluido_por
        const compraçãores = [
            { nome: 'Andréia Trovão', incluido_por: 'Antônio Egidio Neto' },
            { nome: 'Guilherme Dantas', incluido_por: 'Antônio Egidio Neto' }
        ];
        
        for (const c of compraçãores) {
            await pool.query(
                'INSERT INTO compraçãores (nome, situacao, incluido_por) VALUES (?, ?, )',
                [c.nome, 'ativo', c.incluido_por]
            );
            console.log(`   ✅ Compraçãor adicionação: ${c.nome} (incluído por: ${c.incluido_por})`);
        }
        
        // Verificar resultados
        console.log('\n📋 Verificando dados inseridos...');
        
        const [vendedoresResult] = await pool.query('SELECT id, nome, comissao, situacao FROM vendedores ORDER BY nome');
        console.log('\n👥 VENDEDORES cadastraçãos:', vendedoresResult.length);
        vendedoresResult.forEach(v => {
            console.log(`   - ${v.nome} (${v.comissao}% comissão, ${v.situacao})`);
        });
        
        const [compraçãoresResult] = await pool.query('SELECT id, nome, incluido_por, situacao, created_at FROM compraçãores ORDER BY nome');
        console.log('\n🛒 COMPRADORES cadastraçãos:', compraçãoresResult.length);
        compraçãoresResult.forEach(c => {
            console.log(`   - ${c.nome} (incluído por: ${c.incluido_por}, ${c.situacao})`);
        });
        
        console.log('\n✅ Tabelas populadas com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

popularTabelas();
