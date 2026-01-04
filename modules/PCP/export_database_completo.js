const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Configuração do banco de dados
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aluforce_vendas',
    port: 3306
};

// Função para verificar conexão
async function checkConnection() {
    let connection;
    
    try {
        console.log('🔗 Verificando conexão com o banco de dados...');
        connection = await mysql.createConnection(dbConfig);
        
        const [result] = await connection.execute('SELECT 1 as test');
        console.log('✅ Conexão estabelecida com sucesso!');
        
        // Verificar se é o banco correto
        const [dbInfo] = await connection.execute('SELECT DATABASE() as current_db');
        console.log(`📁 Banco atual: ${dbInfo[0].current_db}`);
        
    } catch (error) {
        console.error('❌ Erro de conexão:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Função para verificar estrutura dos daçãos
async function checkDataStructure() {
    let connection;
    
    try {
        console.log('\n📊 Verificando estrutura dos daçãos...');
        connection = await mysql.createConnection(dbConfig);
        
        // Contar tabelas
        const [tables] = await connection.execute(`
            SELECT COUNT(*) as total 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 
        `, [dbConfig.database]);
        
        console.log(`📋 Total de tabelas: ${tables[0].total}`);
        
        // Verificar produtos
        const [produtos] = await connection.execute('SELECT COUNT(*) as total FROM produtos');
        console.log(`🛍️  Total de produtos: ${produtos[0].total}`);
        
        // Verificar estrutura da tabela produtos
        const [colunas] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA =  AND TABLE_NAME = 'produtos'
            ORDER BY ORDINAL_POSITION
        `, [dbConfig.database]);
        
        console.log(`📝 Colunas da tabela produtos (${colunas.length}):`);
        colunas.forEach(col => {
            console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES'  'nullable' : 'not null'})`);
        });
        
        // Verificar algumas outras tabelas importantes
        const tabelasImportantes = ['clientes', 'materiais', 'usuarios'];
        for (const tabela of tabelasImportantes) {
            try {
                const [count] = await connection.execute(`SELECT COUNT(*) as total FROM ${tabela}`);
                console.log(`📊 Total em ${tabela}: ${count[0].total}`);
            } catch (err) {
                console.log(`⚠️  Tabela ${tabela} não encontrada ou inacessível`);
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar estrutura:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Função para verificar integridade dos daçãos
async function checkDataIntegrity() {
    let connection;
    
    try {
        console.log('\n🔍 Verificando integridade dos daçãos...');
        connection = await mysql.createConnection(dbConfig);
        
        // Verificar produtos duplicaçãos
        const [duplicaçãos] = await connection.execute(`
            SELECT codigo, COUNT(*) as count
            FROM produtos 
            GROUP BY codigo 
            HAVING count > 1
            ORDER BY count DESC
        `);
        
        if (duplicaçãos.length > 0) {
            console.log(`\n⚠️  PRODUTOS DUPLICADOS ENCONTRADOS:`);
            duplicaçãos.forEach(dup => {
                console.log(`   Código: ${dup.codigo} - ${dup.count} ocorrências`);
            });
        } else {
            console.log(`✅ Não há produtos duplicaçãos.`);
        }
        
        // Verificar produtos sem nome
        const [semNome] = await connection.execute(`
            SELECT COUNT(*) as count
            FROM produtos 
            WHERE nome IS NULL OR nome = '' OR nome = 'NULL'
        `);
        
        if (semNome[0].count > 0) {
            console.log(`⚠️  ${semNome[0].count} produtos sem nome encontrados.`);
        } else {
            console.log(`✅ Todos os produtos têm nome.`);
        }
        
        // Verificar produtos com códigos válidos
        const [codigosValidos] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN codigo REGEXP '^[A-Z0-9_-]+$' THEN 1 END) as validos
            FROM produtos
        `);
        
        const cv = codigosValidos[0];
        console.log(`📊 Códigos de produtos: ${cv.validos}/${cv.total} válidos`);
        
        // Verificar clientes
        try {
            const [clientesStats] = await connection.execute(`SELECT COUNT(*) as total FROM clientes`);
            console.log(`👥 Total de clientes: ${clientesStats[0].total}`);
        } catch (err) {
            console.log(`⚠️  Tabela clientes não acessível`);
        }
        
        // Verificar materiais
        try {
            const [materiaisStats] = await connection.execute(`SELECT COUNT(*) as total FROM materiais`);
            console.log(`🧱 Total de materiais: ${materiaisStats[0].total}`);
        } catch (err) {
            console.log(`⚠️  Tabela materiais não acessível`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar integridade:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Função principal de backup
async function backupDatabase() {
    let connection;
    
    try {
        console.log('\n💾 Iniciando backup completo do banco de dados...');
        connection = await mysql.createConnection(dbConfig);
        
        // Obter lista de todas as tabelas
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA =  
            ORDER BY TABLE_NAME
        `, [dbConfig.database]);
        
        console.log(`📊 Fazendo backup de ${tables.length} tabelas...`);
        
        let sqlDump = '';
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
        
        // Header do dump
        sqlDump += `-- ========================================\n`;
        sqlDump += `-- DUMP COMPLETO DO BANCO ALUFORCE_VENDAS\n`;
        sqlDump += `-- Data: ${new Date().toLocaleString('pt-BR')}\n`;
        sqlDump += `-- Geração automaticamente\n`;
        sqlDump += `-- ========================================\n\n`;
        
        sqlDump += `SET NAMES utf8mb4;\n`;
        sqlDump += `SET time_zone = '+00:00';\n`;
        sqlDump += `SET foreign_key_checks = 0;\n`;
        sqlDump += `SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';\n\n`;
        
        // Para cada tabela, exportar estrutura e daçãos
        for (let i = 0; i < tables.length; i++) {
            const tableName = tables[i].TABLE_NAME;
            console.log(`   ${i + 1}/${tables.length} - Exportando ${tableName}...`);
            
            try {
                // Exportar estrutura da tabela
                const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
                sqlDump += `-- Estrutura da tabela ${tableName}\n`;
                sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
                sqlDump += createTable[0]['Create Table'] + ';\n\n';
                
                // Contar registros
                const [countResult] = await connection.execute(`SELECT COUNT(*) as total FROM \`${tableName}\``);
                const totalRecords = countResult[0].total;
                
                if (totalRecords > 0) {
                    sqlDump += `-- Daçãos da tabela ${tableName} (${totalRecords} registros)\n`;
                    
                    // Se a tabela tem muitos registros, fazer em lotes
                    const batchSize = 1000;
                    const totalBatches = Math.ceil(totalRecords / batchSize);
                    
                    for (let batch = 0; batch < totalBatches; batch++) {
                        const offset = batch * batchSize;
                        const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\` LIMIT ${batchSize} OFFSET ${offset}`);
                        
                        if (rows.length > 0) {
                            // Obter nomes das colunas
                            const columns = Object.keys(rows[0]);
                            const columnNames = columns.map(col => `\`${col}\``).join(', ');
                            
                            sqlDump += `INSERT INTO \`${tableName}\` (${columnNames}) VALUES\n`;
                            
                            const values = rows.map(row => {
                                const rowValues = columns.map(col => {
                                    const value = row[col];
                                    if (value === null) return 'NULL';
                                    if (typeof value === 'string') {
                                        return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
                                    }
                                    if (value instanceof Date) {
                                        return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                                    }
                                    return value;
                                }).join(', ');
                                return `(${rowValues})`;
                            }).join(',\n');
                            
                            sqlDump += values + ';\n\n';
                        }
                    }
                } else {
                    sqlDump += `-- Tabela ${tableName} está vazia\n\n`;
                }
                
            } catch (tableError) {
                console.log(`   ⚠️  Erro ao exportar ${tableName}: ${tableError.message}`);
                sqlDump += `-- ERRO ao exportar ${tableName}: ${tableError.message}\n\n`;
            }
        }
        
        sqlDump += `SET foreign_key_checks = 1;\n`;
        sqlDump += `-- ========================================\n`;
        sqlDump += `-- FIM DO DUMP\n`;
        sqlDump += `-- ========================================\n`;
        
        // Salvar arquivo
        const fileName = `aluforce_vendas_backup_${timestamp}.sql`;
        const filePath = path.join(__dirname, fileName);
        
        await fs.writeFile(filePath, sqlDump, 'utf8');
        
        console.log(`✅ Backup completo salvo em: ${fileName}`);
        console.log(`📁 Tamanho do arquivo: ${(sqlDump.length / 1024 / 1024).toFixed(2)} MB`);
        
        return fileName;
        
    } catch (error) {
        console.error('❌ Erro durante backup:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Função principal
async function main() {
    console.log('🚀 INICIANDO EXPORT COMPLETO DO BANCO DE DADOS ALUFORCE');
    console.log('==================================================');
    
    try {
        // Verificar conexão
        await checkConnection();
        
        // Verificar estrutura dos daçãos
        await checkDataStructure();
        
        // Verificar integridade
        await checkDataIntegrity();
        
        // Fazer backup completo
        const backupFile = await backupDatabase();
        
        console.log('\n✅ EXPORT COMPLETO FINALIZADO COM SUCESSO!');
        console.log('==================================================');
        console.log(`📁 Arquivo geração: ${backupFile}`);
        console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}`);
        console.log(`📊 Banco: aluforce_vendas com todos os daçãos exportaçãos`);
        
    } catch (error) {
        console.error('\n❌ ERRO NO PROCESSO DE EXPORT:');
        console.error(error.message);
        process.exit(1);
    }
}

// Executar se o script for chamação diretamente
if (require.main === module) {
    main();
}

module.exports = {
    checkConnection,
    checkDataStructure,
    checkDataIntegrity,
    backupDatabase,
    main
};