/**
 * Script para Gerar Estrutura Consolidada do Banco de Daçãos
 * Identifica tabelas essenciais, duplicadas e gera SQL completo
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '@dminalu',
    database: 'aluforce_vendas',
    port: 3306
};

// Definição das tabelas essenciais por módulo
const TABELAS_ESSENCIAIS = {
    'Autenticação': {
        essenciais: ['usuarios'],
        opcionais: ['sessions', 'access_permissions', 'access_resources']
    },
    'Vendas': {
        essenciais: ['clientes', 'pedidos', 'pedido_itens'],
        opcionais: ['cliente_interacoes', 'cliente_tags', 'cliente_tags_relacao', 'pedidos_faturaçãos', 'pedidos_faturaçãos_linhas']
    },
    'Produtos': {
        essenciais: ['produtos'],
        opcionais: ['categorias_produtos', 'produtos_detalhaçãos', 'product_variations']
    },
    'Estoque': {
        essenciais: ['estoque_saldos'],
        opcionais: ['estoque_movimentacoes', 'estoque_lotes', 'alertas_estoque', 'stock_movements']
    },
    'PCP': {
        essenciais: ['ordens_producao'],
        opcionais: ['ordem_producao_materiais', 'apontamentos_producao', 'production_orders', 'production_order_items', 'boms', 'bom_items', 'maquinas', 'setores', 'materiais', 'materiais_primas']
    },
    'Compras': {
        essenciais: ['fornecedores', 'pedidos_compra'],
        opcionais: ['cotacoes_compra', 'requisicoes_compra', 'itens_pedido_compras', 'compras_atividades']
    },
    'Financeiro': {
        essenciais: ['contas_pagar', 'contas_receber', 'contas_bancarias'],
        opcionais: ['contas_receber_parcelas', 'lancamentos_extras', 'financeiro_boletos', 'financeiro_pagamentos', 'categorias_financeiras']
    },
    'NFe': {
        essenciais: ['nfe', 'nfe_itens'],
        opcionais: ['nfe_eventos', 'nfe_configuracoes', 'nfe_logs_sefaz', 'nfe_manifestacoes', 'nfe_inutilizacoes']
    },
    'RH': {
        essenciais: ['funcionarios'],
        opcionais: ['controle_ponto', 'ferias_solicitacoes', 'ferias_periodos', 'rh_folhas_pagamento', 'rh_holerites', 'rh_dependentes', 'rh_beneficios_tipos', 'rh_funcionarios_beneficios', 'rh_avaliacoes_desempenho']
    },
    'Sistema': {
        essenciais: ['configuracoes_empresa'],
        opcionais: ['configuracoes', 'configuracoes_sistema', 'auditoria_sistema', 'auditoria_config']
    }
};

// Tabelas duplicadas conhecidas (escolher uma)
const TABELAS_DUPLICADAS = {
    'nfe': ['nfes'],  // usar 'nfe'
    'pedidos_compra': ['compras_pedidos', 'pedidos_compras', 'ordens_compra'],  // usar 'pedidos_compra'
    'configuracoes_nfe': ['nfe_configuracoes'],  // usar 'nfe_configuracoes'
    'audit_log': ['audit_logs', 'audit_trail', 'auditoria_logs']  // usar 'auditoria_sistema'
};

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

async function consolidarBanco() {
    let connection;
    
    try {
        console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║    CONSOLIDAÇÃO DO BANCO DE DADOS ALUFORCE                ║${colors.reset}`);
        console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

        connection = await mysql.createConnection(dbConfig);
        console.log(`${colors.green}✅ Conectação ao banco${colors.reset}\n`);

        // 1. Obter todas as tabelas
        const [tabelas] = await connection.execute(`
            SELECT TABLE_NAME
            FROM information_schema.tables 
            WHERE table_schema = 
            ORDER BY TABLE_NAME
        `, [dbConfig.database]);

        const todasTabelas = tabelas.map(t => t.TABLE_NAME);
        console.log(`${colors.blue}📊 Total de tabelas no banco: ${todasTabelas.length}${colors.reset}\n`);

        // 2. Classificar tabelas
        const tabelasEssenciais = [];
        const tabelasOpcionais = [];
        const tabelasDuplicadas = [];
        const tabelasNaoClassificadas = [];

        for (const tabela of todasTabelas) {
            let encontrada = false;
            
            // Verificar se é duplicada
            for (const [principal, duplicadas] of Object.entries(TABELAS_DUPLICADAS)) {
                if (duplicadas.includes(tabela)) {
                    tabelasDuplicadas.push({ tabela, duplicadaDe: principal });
                    encontrada = true;
                    break;
                }
            }
            
            if (!encontrada) {
                for (const [modulo, config] of Object.entries(TABELAS_ESSENCIAIS)) {
                    if (config.essenciais.includes(tabela)) {
                        tabelasEssenciais.push({ tabela, modulo });
                        encontrada = true;
                        break;
                    }
                    if (config.opcionais.includes(tabela)) {
                        tabelasOpcionais.push({ tabela, modulo });
                        encontrada = true;
                        break;
                    }
                }
            }
            
            if (!encontrada) {
                tabelasNaoClassificadas.push(tabela);
            }
        }

        // 3. Mostrar resultação
        console.log(`${colors.green}═══ TABELAS ESSENCIAIS (${tabelasEssenciais.length}) ═══${colors.reset}`);
        tabelasEssenciais.forEach(t => console.log(`   ✅ ${t.tabela} [${t.modulo}]`));

        console.log(`\n${colors.yellow}═══ TABELAS OPCIONAIS (${tabelasOpcionais.length}) ═══${colors.reset}`);
        tabelasOpcionais.forEach(t => console.log(`   ⚡ ${t.tabela} [${t.modulo}]`));

        console.log(`\n${colors.red}═══ TABELAS DUPLICADAS (${tabelasDuplicadas.length}) ═══${colors.reset}`);
        tabelasDuplicadas.forEach(t => console.log(`   ⚠️  ${t.tabela} (duplicada de: ${t.duplicadaDe})`));

        console.log(`\n${colors.magenta}═══ TABELAS NÃO CLASSIFICADAS (${tabelasNaoClassificadas.length}) ═══${colors.reset}`);
        tabelasNaoClassificadas.forEach(t => console.log(`   ❓ ${t}`));

        // 4. Gerar SQL com estrutura das tabelas essenciais
        console.log(`\n${colors.cyan}Gerando SQL das tabelas essenciais...${colors.reset}`);
        
        let sqlConsolidação = '';
        sqlConsolidação += `-- ========================================\n`;
        sqlConsolidação += `-- ESTRUTURA CONSOLIDADA ALUFORCE VENDAS\n`;
        sqlConsolidação += `-- Geração em: ${new Date().toLocaleString('pt-BR')}\n`;
        sqlConsolidação += `-- ========================================\n\n`;
        sqlConsolidação += `SET NAMES utf8mb4;\n`;
        sqlConsolidação += `SET time_zone = '+00:00';\n`;
        sqlConsolidação += `SET foreign_key_checks = 0;\n\n`;

        // Criar banco se não existir
        sqlConsolidação += `CREATE DATABASE IF NOT EXISTS aluforce_vendas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
        sqlConsolidação += `USE aluforce_vendas;\n\n`;

        // Tabelas essenciais primeiro
        for (const { tabela, modulo } of tabelasEssenciais) {
            try {
                const [createStmt] = await connection.execute(`SHOW CREATE TABLE \`${tabela}\``);
                sqlConsolidação += `-- ========================================\n`;
                sqlConsolidação += `-- TABELA ESSENCIAL: ${tabela} [${modulo}]\n`;
                sqlConsolidação += `-- ========================================\n`;
                sqlConsolidação += `DROP TABLE IF EXISTS \`${tabela}\`;\n`;
                sqlConsolidação += createStmt[0]['Create Table'] + ';\n\n';
            } catch (err) {
                console.log(`${colors.yellow}⚠️  Não foi possível obter estrutura de: ${tabela}${colors.reset}`);
            }
        }

        // Tabelas opcionais
        for (const { tabela, modulo } of tabelasOpcionais) {
            try {
                const [createStmt] = await connection.execute(`SHOW CREATE TABLE \`${tabela}\``);
                sqlConsolidação += `-- ========================================\n`;
                sqlConsolidação += `-- TABELA OPCIONAL: ${tabela} [${modulo}]\n`;
                sqlConsolidação += `-- ========================================\n`;
                sqlConsolidação += `DROP TABLE IF EXISTS \`${tabela}\`;\n`;
                sqlConsolidação += createStmt[0]['Create Table'] + ';\n\n';
            } catch (err) {
                // Ignorar erros silenciosamente
            }
        }

        sqlConsolidação += `SET foreign_key_checks = 1;\n`;
        sqlConsolidação += `-- FIM DO SCHEMA\n`;

        // 5. Salvar arquivo SQL
        const sqlFile = path.join(__dirname, 'SCHEMA_CONSOLIDADO.sql');
        await fs.writeFile(sqlFile, sqlConsolidação, 'utf8');
        console.log(`\n${colors.green}✅ Schema consolidação salvo em: SCHEMA_CONSOLIDADO.sql${colors.reset}`);

        // 6. Gerar SQL de daçãos iniciais (seed)
        let sqlSeed = '';
        sqlSeed += `-- ========================================\n`;
        sqlSeed += `-- DADOS INICIAIS - ALUFORCE VENDAS\n`;
        sqlSeed += `-- Execute após criar as tabelas\n`;
        sqlSeed += `-- ========================================\n\n`;
        sqlSeed += `USE aluforce_vendas;\n\n`;

        // Usuário admin
        sqlSeed += `-- USUÁRIO ADMINISTRADOR\n`;
        sqlSeed += `INSERT INTO usuarios (nome, email, senha, cargo, ativo, data_criacao) VALUES\n`;
        sqlSeed += `('Administraçãor', 'admin@aluforce.com', SHA2('admin123', 256), 'Administraçãor', 1, NOW())\n`;
        sqlSeed += `ON DUPLICATE KEY UPDATE nome = VALUES(nome);\n\n`;

        // Configurações empresa
        sqlSeed += `-- CONFIGURAÇÕES DA EMPRESA\n`;
        sqlSeed += `INSERT INTO configuracoes_empresa (razao_social, nome_fantasia, cnpj, inscricao_estadual, endereco, cidade, uf, cep, telefone, email) VALUES\n`;
        sqlSeed += `('ALUFORCE LTDA', 'ALUFORCE', '00.000.000/0001-00', '000.000.000.000', 'Rua Principal, 100', 'São Paulo', 'SP', '00000-000', '(11) 0000-0000', 'contato@aluforce.com')\n`;
        sqlSeed += `ON DUPLICATE KEY UPDATE razao_social = VALUES(razao_social);\n\n`;

        // Categorias de produtos
        sqlSeed += `-- CATEGORIAS DE PRODUTOS\n`;
        sqlSeed += `INSERT INTO categorias_produtos (nome, descricao, ativo) VALUES\n`;
        sqlSeed += `('Esquadrias', 'Portas, janelas e esquadrias de alumínio', 1),\n`;
        sqlSeed += `('Perfis', 'Perfis de alumínio diversos', 1),\n`;
        sqlSeed += `('Vidros', 'Vidros temperaçãos e comuns', 1),\n`;
        sqlSeed += `('Acessórios', 'Fechaduras, dobradiças e acessórios', 1)\n`;
        sqlSeed += `ON DUPLICATE KEY UPDATE nome = VALUES(nome);\n\n`;

        // Produtos exemplo
        sqlSeed += `-- PRODUTOS DE EXEMPLO\n`;
        sqlSeed += `INSERT INTO produtos (codigo, nome, descricao, unidade_medida, preco_venda, status, data_criacao) VALUES\n`;
        sqlSeed += `('PRD001', 'Perfil de Alumínio 2"', 'Perfil de alumínio anodização 2 polegadas', 'MT', 45.00, 'ativo', NOW()),\n`;
        sqlSeed += `('PRD002', 'Vidro Temperação 8mm', 'Vidro temperação incolor 8mm', 'M2', 180.00, 'ativo', NOW()),\n`;
        sqlSeed += `('PRD003', 'Fechadura de Centro', 'Fechadura de centro para porta de alumínio', 'UN', 85.00, 'ativo', NOW())\n`;
        sqlSeed += `ON DUPLICATE KEY UPDATE codigo = VALUES(codigo);\n\n`;

        // Contas bancárias
        sqlSeed += `-- CONTAS BANCÁRIAS\n`;
        sqlSeed += `INSERT INTO contas_bancarias (nome, banco, agencia, conta, tipo, saldo_inicial, ativo) VALUES\n`;
        sqlSeed += `('Conta Principal', 'Banco do Brasil', '0001', '12345-6', 'corrente', 0.00, 1),\n`;
        sqlSeed += `('Caixa', 'Interno', '-', 'CAIXA', 'caixa', 0.00, 1)\n`;
        sqlSeed += `ON DUPLICATE KEY UPDATE nome = VALUES(nome);\n\n`;

        const seedFile = path.join(__dirname, 'SEED_DADOS_INICIAIS.sql');
        await fs.writeFile(seedFile, sqlSeed, 'utf8');
        console.log(`${colors.green}✅ Daçãos iniciais salvos em: SEED_DADOS_INICIAIS.sql${colors.reset}`);

        // 7. Resumo final
        console.log(`\n${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.cyan}                      RESUMO FINAL                           ${colors.reset}`);
        console.log(`${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);

        console.log(`📊 Total de tabelas: ${todasTabelas.length}`);
        console.log(`${colors.green}✅ Essenciais: ${tabelasEssenciais.length}${colors.reset}`);
        console.log(`${colors.yellow}⚡ Opcionais: ${tabelasOpcionais.length}${colors.reset}`);
        console.log(`${colors.red}⚠️  Duplicadas: ${tabelasDuplicadas.length}${colors.reset}`);
        console.log(`${colors.magenta}❓ Não classificadas: ${tabelasNaoClassificadas.length}${colors.reset}`);

        console.log(`\n${colors.green}Arquivos geraçãos:${colors.reset}`);
        console.log(`   📄 SCHEMA_CONSOLIDADO.sql - Estrutura das tabelas`);
        console.log(`   📄 SEED_DADOS_INICIAIS.sql - Daçãos iniciais`);

        return {
            essenciais: tabelasEssenciais,
            opcionais: tabelasOpcionais,
            duplicadas: tabelasDuplicadas,
            naoClassificadas: tabelasNaoClassificadas
        };

    } catch (error) {
        console.error(`${colors.red}❌ Erro: ${error.message}${colors.reset}`);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Executar
consolidarBanco()
    .then(() => {
        console.log(`\n${colors.green}✅ Consolidação concluída!${colors.reset}`);
    })
    .catch(error => {
        console.error(`\n${colors.red}❌ Erro: ${error.message}${colors.reset}`);
        process.exit(1);
    });
