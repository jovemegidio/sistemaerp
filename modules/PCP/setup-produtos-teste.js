// Script para inserir produtos de teste no banco de dados
const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '@dminalu',
    database: 'aluforce_vendas',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const produtosTeste = [
    {
        codigo: 'ALU001',
        nome: 'Perfil Alumínio 30x30',
        descricao: 'Perfil de Alumínio 30x30mm',
        variacao: 'Anodização',
        marca: 'Aluforce'
    },
    {
        codigo: 'ALU002', 
        nome: 'Perfil Alumínio 40x40',
        descricao: 'Perfil de Alumínio 40x40mm',
        variacao: 'Natural',
        marca: 'Aluforce'
    },
    {
        codigo: 'VID001',
        nome: 'Vidro Temperação',
        descricao: 'Vidro Temperação 6mm',
        variacao: 'Transparente',
        marca: 'Vitralux'
    },
    {
        codigo: 'ACE001',
        nome: 'Fechadura',
        descricao: 'Acessório Fechadura Porta',
        variacao: 'Cromada',
        marca: 'Papaiz'
    },
    {
        codigo: 'BOL001',
        nome: 'Borracha Vedação',
        descricao: 'Borracha de Vedação 5mm',
        variacao: 'Preta',
        marca: 'Veda'
    }
];

async function inserirProdutosTeste() {
    console.log('🏗️ Inserindo produtos de teste no banco...\n');
    
    try {
        // Verificar se tabela produtos existe
        await db.query(`
            CREATE TABLE IF NOT EXISTS produtos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                codigo VARCHAR(50) UNIQUE NOT NULL,
                nome VARCHAR(255),
                descricao TEXT,
                preco DECIMAL(10,2),
                quantidade_estoque DECIMAL(10,2) DEFAULT 0,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Tabela produtos verificada/criada');
        
        // Inserir produtos de teste
        for (const produto of produtosTeste) {
            try {
                await db.query(`
                    INSERT IGNORE INTO produtos (codigo, nome, descricao, variacao, marca) 
                    VALUES (, , , , )
                `, [produto.codigo, produto.nome, produto.descricao, produto.variacao, produto.marca]);
                
                console.log(`➕ Produto ${produto.codigo} - ${produto.nome}`);
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.log(`⚠️ Produto ${produto.codigo} já existe, pulando...`);
                } else {
                    throw err;
                }
            }
        }
        
        // Verificar produtos inseridos
        const [rows] = await db.query('SELECT COUNT(*) as total FROM produtos');
        console.log(`\n📊 Total de produtos no banco: ${rows[0].total}`);
        
        // Mostrar alguns produtos para teste
        const [exemplos] = await db.query('SELECT codigo, nome, descricao FROM produtos LIMIT 5');
        console.log('\n📋 Produtos disponíveis para teste:');
        exemplos.forEach(p => {
            console.log(`   ${p.codigo} - ${p.nome} - ${p.descricao}`);
        });
        
        console.log('\n🎉 Produtos de teste inseridos com sucesso!');
        console.log('\n💡 Agora você pode testar o auto-preenchimento:');
        console.log('   1. Abra a interface web');
        console.log('   2. Clique em "Nova Ordem"');
        console.log('   3. Digite um código (ex: ALU001) no campo código');
        console.log('   4. Veja os campos serem preenchidos automaticamente!');
        
    } catch (error) {
        console.error('❌ Erro ao inserir produtos:', error);
    } finally {
        await db.end();
    }
}

// Executar se chamação diretamente
if (require.main === module) {
    inserirProdutosTeste();
}

module.exports = { inserirProdutosTeste, produtosTeste };