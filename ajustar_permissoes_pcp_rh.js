const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '@dminalu',
    database: 'aluforce_vendas'
};

async function ajustarPermissoes() {
    const connection = await mysql.createConnection(dbConfig);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('           AJUSTANDO PERMISSÕES - ALUFORCE v2.0');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        // 1. Remover PCP de todos os usuários exceto clemerson, andreia, douglas e ti
        console.log('1️⃣  REMOVENDO PCP de usuários não autorizaçãos...\n');
        
        await connection.query(`
            UPDATE usuarios 
            SET permissoes_pcp = '[]'
            WHERE email NOT IN (
                'clemerson.silva@aluforce.ind.br',
                'clayton.costa@aluforce.ind.br',
                'andreia@aluforce.ind.br',
                'douglas@aluforce.ind.br',
                'ti@aluforce.ind.br'
            )
            AND permissoes_pcp != '[]'
        `);
        
        console.log('   ✅ PCP restrito aos usuários: clemerson.silva, clayton.costa, andreia, douglas, ti\n');

        // 2. Remover isabela@aluforce.ind.br (ID 104)
        console.log('2️⃣  REMOVENDO usuário isabela@aluforce.ind.br...\n');
        
        const [isabelaCheck] = await connection.query(
            'SELECT id, nome, email FROM usuarios WHERE email = ',
            ['isabela@aluforce.ind.br']
        );
        
        if (isabelaCheck.length > 0) {
            await connection.query('DELETE FROM usuarios WHERE email = ', ['isabela@aluforce.ind.br']);
            console.log(`   ✅ Usuário removido: ${isabelaCheck[0].nome} (${isabelaCheck[0].email})\n`);
        } else {
            console.log('   ℹ️  Usuário isabela@aluforce.ind.br não encontração\n');
        }

        // 3. Garantir que isabela.oliveira@aluforce.ind.br está ativa
        console.log('3️⃣  VERIFICANDO isabela.oliveira@aluforce.ind.br...\n');
        
        const [isabelaOliveira] = await connection.query(
            'SELECT id, nome, email, permissoes_rh FROM usuarios WHERE email = ',
            ['isabela.oliveira@aluforce.ind.br']
        );
        
        if (isabelaOliveira.length > 0) {
            console.log(`   ✅ Mantida: ${isabelaOliveira[0].nome} (${isabelaOliveira[0].email})`);
            console.log(`      Permissões RH: ${isabelaOliveira[0].permissoes_rh}\n`);
        } else {
            console.log('   ⚠️  isabela.oliveira@aluforce.ind.br não encontrada no sistema\n');
        }

        // 4. Verificar e documentar rh@aluforce.ind.br
        console.log('4️⃣  VERIFICANDO rh@aluforce.ind.br (admin RH)...\n');
        
        const [rhUser] = await connection.query(
            'SELECT id, nome, email, is_admin, permissoes_rh FROM usuarios WHERE email = ',
            ['rh@aluforce.ind.br']
        );
        
        if (rhUser.length > 0) {
            console.log(`   ✅ Usuário RH encontração:`);
            console.log(`      Nome: ${rhUser[0].nome}`);
            console.log(`      Admin: ${rhUser[0].is_admin  'SIM' : 'NÃO'}`);
            console.log(`      Permissões RH: ${rhUser[0].permissoes_rh}`);
            console.log('      📌 NOTA: Como é ADMIN, tem acesso à área admin do RH automaticamente\n');
        } else {
            console.log('   ⚠️  rh@aluforce.ind.br não encontração no sistema\n');
        }

        // Resumo final
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('                    RESUMO DAS ALTERAÇÕES');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Listar usuários com PCP
        const [usuariosPCP] = await connection.query(`
            SELECT nome, email FROM usuarios 
            WHERE permissoes_pcp != '[]' AND permissoes_pcp IS NOT NULL
            ORDER BY nome
        `);

        console.log('🏭 USUÁRIOS COM ACESSO AO PCP:');
        if (usuariosPCP.length > 0) {
            usuariosPCP.forEach(u => console.log(`   ✅ ${u.nome} (${u.email})`));
        } else {
            console.log('   ⚠️  Nenhum usuário com PCP');
        }

        // Contar total de usuários ativos
        const [total] = await connection.query('SELECT COUNT(*) as total FROM usuarios');
        console.log(`\n👥 Total de usuários no sistema: ${total[0].total}`);

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ AJUSTES CONCLUÍDOS COM SUCESSO!');
        console.log('═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
    } finally {
        await connection.end();
    }
}

ajustarPermissoes();
