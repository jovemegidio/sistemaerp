// Script para configurar acesso PCP adaptação à estrutura existente
const mysql = require('mysql2/promise');

console.log('🔐 CONFIGURANDO ACESSO PCP PARA COLABORADORES (ADAPTADO)\n');

async function configurarAcessoPCPAdaptação() {
    let connection;
    
    try {
        // Conectar ao banco
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'aluforce_vendas'
        });
        
        console.log('✅ Conectação ao banco de dados\n');
        
        // Lista de colaboraçãores que precisam de acesso
        const colaboraçãores = [
            {
                email: 'ti@aluforce.ind.br',
                nome: 'TI Aluforce',
                role: 'admin'
            },
            {
                email: 'andreia@aluforce.ind.br',
                nome: 'Andreia',
                role: 'pcp'
            },
            {
                email: 'douglas@aluforce.ind.br',
                nome: 'Douglas',
                role: 'pcp'
            },
            {
                email: 'guilherme@aluforce.ind.br',
                nome: 'Guilherme',
                role: 'pcp'
            },
            {
                email: 'thiago@aluforce.ind.br',
                nome: 'Thiago',
                role: 'pcp'
            }
        ];
        
        console.log('👥 COLABORADORES PARA ACESSO PCP:');
        console.log('='.repeat(50));
        colaboraçãores.forEach((col, index) => {
            console.log(`${index + 1}. ${col.nome} (${col.email}) - ${col.role}`);
        });
        console.log('');
        
        // Primeiro, vamos adicionar campos necessários se não existirem
        console.log('🔧 Atualizando estrutura da tabela...\n');
        
        try {
            // Adicionar campo ativo
            await connection.execute(`
                ALTER TABLE usuarios_pcp 
                ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE
            `);
            console.log('✅ Campo "ativo" adicionação/verificação');
        } catch (e) {
            console.log('ℹ️ Campo "ativo" já existe ou erro:', e.message);
        }
        
        try {
            // Adicionar campo permissoes
            await connection.execute(`
                ALTER TABLE usuarios_pcp 
                ADD COLUMN IF NOT EXISTS permissoes JSON
            `);
            console.log('✅ Campo "permissoes" adicionação/verificação');
        } catch (e) {
            console.log('ℹ️ Campo "permissoes" já existe ou erro:', e.message);
        }
        
        try {
            // Adicionar campo observacoes
            await connection.execute(`
                ALTER TABLE usuarios_pcp 
                ADD COLUMN IF NOT EXISTS observacoes TEXT
            `);
            console.log('✅ Campo "observacoes" adicionação/verificação');
        } catch (e) {
            console.log('ℹ️ Campo "observacoes" já existe ou erro:', e.message);
        }
        
        console.log('');
        
        // Processar cada colaboraçãor
        let sucessos = 0;
        let atualizacoes = 0;
        let erros = 0;
        
        for (const colaboraçãor of colaboraçãores) {
            try {
                console.log(`🔄 Processando: ${colaboraçãor.nome} (${colaboraçãor.email})`);
                
                // Verificar se já existe
                const [existe] = await connection.execute(
                    'SELECT id FROM usuarios_pcp WHERE email = ',
                    [colaboraçãor.email]
                );
                
                // Gerar senha padrão
                const senhaTemporaria = `Aluforce2025!${colaboraçãor.nome.substring(0, 3)}`;
                
                // Definir permissões baseadas no role
                const permissoes = {
                    pcp: {
                        visualizar: true,
                        criar_ordem: true,
                        editar_ordem: colaboraçãor.role === 'admin',
                        excluir_ordem: colaboraçãor.role === 'admin',
                        gerenciar_usuarios: colaboraçãor.role === 'admin',
                        relatorios: true,
                        dashboard: true
                    },
                    admin: colaboraçãor.role === 'admin'
                };
                
                if (existe.length > 0) {
                    // Atualizar usuário existente
                    await connection.execute(`
                        UPDATE usuarios_pcp 
                        SET nome = , 
                            role = 
                        WHERE email = 
                    `, [colaboraçãor.nome, colaboraçãor.role, colaboraçãor.email]);
                    
                    // Tentar atualizar campos extras se existirem
                    try {
                        await connection.execute(`
                            UPDATE usuarios_pcp 
                            SET permissoes = ,
                                ativo = TRUE,
                                observacoes = CONCAT(IFNULL(observacoes, ''), 
                                                   '\n[', NOW(), '] Acesso atualização automaticamente')
                            WHERE email = 
                        `, [JSON.stringify(permissoes), colaboraçãor.email]);
                    } catch (e) {
                        console.log(`   ⚠️ Campos extras não atualizaçãos: ${e.message}`);
                    }
                    
                    console.log(`   ✅ Usuário atualização (ID: ${existe[0].id})`);
                    atualizacoes++;
                } else {
                    // Criar novo usuário com estrutura básica
                    const [result] = await connection.execute(`
                        INSERT INTO usuarios_pcp 
                        (email, senha, nome, role)
                        VALUES (, , , )
                    `, [colaboraçãor.email, senhaTemporaria, colaboraçãor.nome, colaboraçãor.role]);
                    
                    // Tentar adicionar campos extras se existirem
                    try {
                        await connection.execute(`
                            UPDATE usuarios_pcp 
                            SET permissoes = ,
                                ativo = TRUE,
                                observacoes = 
                            WHERE id = 
                        `, [
                            JSON.stringify(permissoes),
                            `Usuário criado automaticamente em ${new Date().toLocaleString('pt-BR')}. Senha temporária: ${senhaTemporaria}`,
                            result.insertId
                        ]);
                    } catch (e) {
                        console.log(`   ⚠️ Campos extras não definidos: ${e.message}`);
                    }
                    
                    console.log(`   ✅ Novo usuário criado (ID: ${result.insertId})`);
                    console.log(`   🔑 Senha temporária: ${senhaTemporaria}`);
                    sucessos++;
                }
                
            } catch (error) {
                console.log(`   ❌ Erro ao processar ${colaboraçãor.email}: ${error.message}`);
                erros++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 RELATÓRIO FINAL DE CONFIGURAÇÃO');
        console.log('='.repeat(60));
        console.log(`✅ Novos usuários criados: ${sucessos}`);
        console.log(`🔄 Usuários atualizaçãos: ${atualizacoes}`);
        console.log(`❌ Erros encontrados: ${erros}`);
        
        // Mostrar status final de todos os usuários PCP
        const [todosUsuarios] = await connection.execute(`
            SELECT id, nome, email, role, created_at
            FROM usuarios_pcp 
            ORDER BY nome
        `);
        
        console.log('\n👥 USUÁRIOS PCP CONFIGURADOS:');
        console.log('='.repeat(50));
        todosUsuarios.forEach((user, index) => {
            const dataFormatada = new Date(user.created_at).toLocaleDateString('pt-BR');
            console.log(`${index + 1}. ✅ ${user.nome} (${user.email}) - ${user.role} [${dataFormatada}]`);
        });
        
        // Verificar se todos os colaboraçãores estão na lista
        console.log('\n🔍 VERIFICAÇÃO DE COBERTURA:');
        console.log('='.repeat(50));
        
        for (const colaboraçãor of colaboraçãores) {
            const usuario = todosUsuarios.find(u => u.email === colaboraçãor.email);
            if (usuario) {
                console.log(`✅ ${colaboraçãor.nome}: Configuração (ID: ${usuario.id})`);
            } else {
                console.log(`❌ ${colaboraçãor.nome}: NÃO configuração`);
            }
        }
        
        // Instruções para próximos passos
        console.log('\n📋 PRÓXIMOS PASSOS:');
        console.log('='.repeat(50));
        console.log('1. ✅ Usuários configuraçãos no banco de dados');
        console.log('2. 🔑 Senhas temporárias definidas (ver logs acima)');
        console.log('3. 🔐 Usuários devem alterar senha no primeiro login');
        console.log('4. 📧 Enviar credenciais por canal seguro');
        console.log('5. 🖥️ Verificar se interface PCP reconhece os usuários');
        console.log('6. ⚙️ Configurar permissões específicas se necessário');
        
        console.log('\n🎉 Configuração de acesso PCP concluída!');
        
    } catch (error) {
        console.error('❌ Erro durante configuração:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexão com banco encerrada');
        }
    }
}

configurarAcessoPCPAdaptação();