const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function updatePasswords() {
    const db = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'aluforce_vendas',
        port: 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Atualizando senhas dos usuários...');
        
        // Gerar hash bcrypt para a senha 'alupcp01'
        const newPassword = 'alupcp01';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        console.log(`Nova senha: ${newPassword}`);
        console.log(`Hash geração: ${hashedPassword}`);
        
        // Atualizar senha do admin@local
        console.log('\n1. Atualizando senha do admin@local...');
        const [result1] = await db.query(
            "UPDATE usuarios_pcp SET senha =  WHERE email = ", 
            [hashedPassword, 'admin@local']
        );
        console.log(`✓ Admin atualização. Linhas afetadas: ${result1.affectedRows}`);
        
        // Atualizar senha do clemerson
        console.log('\n2. Atualizando senha do clemerson.silva@aluforce.ind.br...');
        const [result2] = await db.query(
            "UPDATE usuarios_pcp SET senha =  WHERE email = ", 
            [hashedPassword, 'clemerson.silva@aluforce.ind.br']
        );
        console.log(`✓ Clemerson atualização. Linhas afetadas: ${result2.affectedRows}`);
        
        // Verificar as atualizações
        console.log('\n3. Verificando as atualizações...');
        const [users] = await db.query("SELECT id, email, nome, LEFT(senha, 10) as senha_preview FROM usuarios_pcp");
        
        console.log('Usuários atualizaçãos:');
        users.forEach(user => {
            console.log(`- ${user.email} (${user.nome}): senha inicia com ${user.senha_preview}...`);
        });
        
        // Testar se a nova senha funciona
        console.log('\n4. Testando se a nova senha funciona...');
        const testResult1 = await bcrypt.compare(newPassword, hashedPassword);
        console.log(`✓ Teste bcrypt.compare('${newPassword}', hash): ${testResult1}`);
        
        console.log('\n✅ Senhas atualizadas com sucesso!');
        console.log(`📋 Agora ambos os usuários podem fazer login com a senha: ${newPassword}`);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar senhas:', error.message);
    } finally {
        await db.end();
    }
}

updatePasswords();