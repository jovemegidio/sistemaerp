/**
 * Script para configurar permissões de vendas dos usuários específicos
 */

const mysql = require('mysql2/promise');

async function configurePermissions() {
    let connection;
    
    try {
        // Testar diferentes senhas
        const passwords = ['', 'aluvendas01', 'root', '123456', 'admin'];
        
        for (const pass of passwords) {
            try {
                connection = await mysql.createConnection({
                    host: 'localhost',
                    user: 'root',
                    password: pass,
                    database: 'aluforce_vendas'
                });
                console.log(`✅ Conectação com senha: "${pass || '(vazia)'}"`);
                break;
            } catch (e) {
                if (e.code === 'ER_ACCESS_DENIED_ERROR') {
                    continue;
                }
                throw e;
            }
        }

        if (!connection) {
            throw new Error('Não foi possível conectar ao banco de dados com nenhuma senha');
        }

        // Permissões completas de vendas
        const permissoesVendas = JSON.stringify({
            visualizar: true,
            criar: true,
            editar: true,
            excluir: true,
            aprovar: true,
            dashboard: true
        });

        // Lista de usuários que devem ter acesso a vendas
        const usuariosVendas = [
            { email: 'ti@aluforce.ind.br', nome: 'TI' },
            { email: 'douglas@aluforce.ind.br', nome: 'Douglas' },
            { email: 'andreia@aluforce.ind.br', nome: 'Andreia' },
            { email: 'renata@aluforce.ind.br', nome: 'Renata' },
            { email: 'augusto@aluforce.ind.br', nome: 'Augusto' },
            { email: 'marcia@aluforce.ind.br', nome: 'Marcia' },
            { email: 'clemerson@aluforce.ind.br', nome: 'Clemerson' },
            { email: 'thiago@aluforce.ind.br', nome: 'Thiago' },
            { email: 'ariel@aluforce.ind.br', nome: 'Ariel' },
            { email: 'fabiano@aluforce.ind.br', nome: 'Fabiano' },
            { email: 'fabiola@aluforce.ind.br', nome: 'Fabiola' }
        ];

        console.log('\n📝 Configurando permissões de vendas...\n');

        // 1. Primeiro, garantir que todos os admins têm is_admin = 1
        const [resultAdmin] = await connection.execute(
            `UPDATE usuarios SET is_admin = 1 WHERE email IN (, )`,
            ['ti@aluforce.ind.br', 'admin@aluforce.ind.br']
        );
        console.log(`👑 Admins configuraçãos: ${resultAdmin.affectedRows} registros`);

        // 2. Atualizar permissões para cada usuário
        for (const usuario of usuariosVendas) {
            try {
                // Tentar atualizar por email exato
                let [result] = await connection.execute(
                    `UPDATE usuarios SET permissoes_vendas =  WHERE email = `,
                    [permissoesVendas, usuario.email]
                );

                if (result.affectedRows > 0) {
                    console.log(`✅ ${usuario.nome} (${usuario.email}) - Permissões atualizadas`);
                    continue;
                }

                // Tentar por nome
                [result] = await connection.execute(
                    `UPDATE usuarios SET permissoes_vendas =  WHERE nome LIKE `,
                    [permissoesVendas, `%${usuario.nome}%`]
                );

                if (result.affectedRows > 0) {
                    console.log(`✅ ${usuario.nome} - Permissões atualizadas (por nome)`);
                    continue;
                }

                // Tentar por login
                const login = usuario.email.split('@')[0];
                [result] = await connection.execute(
                    `UPDATE usuarios SET permissoes_vendas =  WHERE login = `,
                    [permissoesVendas, login]
                );

                if (result.affectedRows > 0) {
                    console.log(`✅ ${usuario.nome} - Permissões atualizadas (por login)`);
                    continue;
                }

                console.log(`⚠️  ${usuario.nome} (${usuario.email}) - Usuário não encontrado`);

            } catch (error) {
                console.error(`❌ Erro ao atualizar ${usuario.email}:`, error.message);
            }
        }

        // 3. Listar todos os usuários e suas permissões
        console.log('\n📊 Status atual dos usuários:\n');
        const [usuarios] = await connection.execute(
            `SELECT id, nome, email, login, is_admin, 
                    CASE WHEN permissoes_vendas IS NOT NULL THEN '✅' ELSE '❌' END as vendas_perm
             FROM usuarios 
             ORDER BY is_admin DESC, nome`
        );

        console.log('ID\tNome\t\t\tEmail/Login\t\t\tAdmin\tVendas');
        console.log('─'.repeat(80));
        usuarios.forEach(u => {
            const name = (u.nome || '').padEnd(20).substring(0, 20);
            const emailLogin = (u.email || u.login || '').padEnd(30).substring(0, 30);
            const admin = u.is_admin  '👑' : '  ';
            console.log(`${u.id}\t${name}\t${emailLogin}\t${admin}\t${u.vendas_perm}`);
        });

        await connection.end();
        console.log('\n✅ Configuração concluída!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

configurePermissions();
