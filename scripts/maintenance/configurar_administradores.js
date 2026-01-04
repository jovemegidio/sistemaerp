#!/usr/bin/env node
/**
 * Script para configurar roles de administraçãores
 * Administraçãores: Andreia, Douglas, TI
 * Demais: Colaboraçãores (role: user)
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração do banco de daçãos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aluforce_vendas',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
};

// Administraçãores (por email)
const ADMINISTRADORES = [
    'andreia@aluforce.ind.br',
    'douglas@aluforce.ind.br',
    'ti@aluforce.ind.br'
];

async function configurarRoles() {
    let connection;
    
    try {
        console.log('\n' + '='.repeat(70));
        console.log('👑 CONFIGURAÇÁO DE ROLES - Sistema Aluforce v.2');
        console.log('='.repeat(70));
        console.log('\n📍 Conectando ao banco: ' + dbConfig.database + '@' + dbConfig.host);
        
        // Conectar ao banco
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexão estabelecida\n');
        
        // Buscar todos os usuários
        console.log('👥 Buscando todos os usuários...');
        const [usuarios] = await connection.query(
            'SELECT id, nome, email, role FROM usuarios ORDER BY nome'
        );
        
        console.log(`📊 Total de usuários: ${usuarios.length}\n`);
        
        // Separar administraçãores e colaboraçãores
        let admins = [];
        let colaboraçãores = [];
        
        for (const user of usuarios) {
            const email = (user.email || '').toLowerCase();
            if (ADMINISTRADORES.includes(email)) {
                admins.push(user);
            } else {
                colaboraçãores.push(user);
            }
        }
        
        console.log('👑 ADMINISTRADORES IDENTIFICADOS (' + admins.length + '):');
        console.log('='.repeat(70));
        admins.forEach((user, index) => {
            console.log(`${index + 1}. [ID: ${user.id}] ${user.name || user.nome} (${user.email}) - Role atual: ${user.role || 'não definida'}`);
        });
        
        console.log('\n👤 COLABORADORES IDENTIFICADOS (' + colaboraçãores.length + '):');
        console.log('='.repeat(70));
        colaboraçãores.slice(0, 5).forEach((user, index) => {
            console.log(`${index + 1}. [ID: ${user.id}] ${user.nome} (${user.email}) - Role atual: ${user.role || 'não definida'}`);
        });
        if (colaboraçãores.length > 5) {
            console.log(`... e mais ${colaboraçãores.length - 5} colaboraçãores`);
        }
        
        console.log('\n🔄 Atualizando roles...\n');
        
        // Atualizar administraçãores para role = 'admin'
        let adminUpdates = 0;
        for (const user of admins) {
            try {
                await connection.query(
                    'UPDATE usuarios SET role = , is_admin = 1 WHERE id = ',
                    ['admin', user.id]
                );
                console.log(`👑 [ID: ${user.id}] ${user.nome} → admin`);
                adminUpdates++;
            } catch (error) {
                console.log(`❌ [ID: ${user.id}] ${user.nome} - ERRO: ${error.message}`);
            }
        }
        
        // Atualizar colaboraçãores para role = 'user'
        let userUpdates = 0;
        for (const user of colaboraçãores) {
            try {
                await connection.query(
                    'UPDATE usuarios SET role = , is_admin = 0 WHERE id = ',
                    ['user', user.id]
                );
                if (userUpdates < 5) {
                    console.log(`👤 [ID: ${user.id}] ${user.nome} → user`);
                }
                userUpdates++;
            } catch (error) {
                console.log(`❌ [ID: ${user.id}] ${user.nome} - ERRO: ${error.message}`);
            }
        }
        
        if (userUpdates > 5) {
            console.log(`👤 ... e mais ${userUpdates - 5} colaboraçãores atualizaçãos`);
        }
        
        // Relatório final
        console.log('\n' + '='.repeat(70));
        console.log('📊 RELATÓRIO FINAL');
        console.log('='.repeat(70));
        console.log(`👑 Administraçãores configuraçãos: ${adminUpdates}`);
        console.log(`👤 Colaboraçãores configuraçãos: ${userUpdates}`);
        console.log(`✅ Total de atualizações: ${adminUpdates + userUpdates}`);
        console.log('='.repeat(70));
        
        // Verificar resultação
        console.log('\n🔍 Verificando configuração final...\n');
        
        const [verificacao] = await connection.query(
            "SELECT role, COUNT(*) as total FROM usuarios GROUP BY role ORDER BY role"
        );
        
        console.log('📋 Distribuição de roles:');
        verificacao.forEach(row => {
            const emoji = row.role === 'admin'  '👑' : '👤';
            console.log(`  ${emoji} ${row.role}: ${row.total} usuários`);
        });
        
        // Listar administraçãores finais
        const [adminsFinais] = await connection.query(
            "SELECT id, nome, email FROM usuarios WHERE role = 'admin' ORDER BY nome"
        );
        
        console.log('\n👑 ADMINISTRADORES CONFIRMADOS:');
        console.log('='.repeat(70));
        adminsFinais.forEach((admin, index) => {
            console.log(`${index + 1}. ${admin.nome} (${admin.email})`);
        });
        console.log('='.repeat(70));
        
        console.log('\n✅ Configuração concluída com sucesso!\n');
        
    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        if (error.stack) {
            console.error('\n📋 Stack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexão com o banco encerrada\n');
        }
    }
}

// Executar script
configurarRoles()
    .then(() => {
        console.log('✅ Processo finalização com sucesso');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    });
