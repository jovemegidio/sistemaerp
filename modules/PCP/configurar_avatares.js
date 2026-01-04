// Script para adicionar campo foto_url e configurar avatares dos usuários
const mysql = require('mysql2/promise');

console.log('📸 CONFIGURANDO AVATARES DOS USUÁRIOS PCP\n');

async function configurarAvatares() {
    let connection;
    
    try {
        // Conectar ao banco
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'aluforce_vendas'
        });
        
        console.log('✅ Conectação ao banco de daçãos\n');
        
        // Adicionar campo foto_url se não existir
        console.log('🔧 Verificando/adicionando campo foto_url...');
        
        try {
            await connection.execute(`
                ALTER TABLE usuarios_pcp 
                ADD COLUMN IF NOT EXISTS foto_url VARCHAR(255)
            `);
            console.log('✅ Campo "foto_url" adicionação/verificação\n');
        } catch (e) {
            console.log('ℹ️ Campo "foto_url" já existe ou erro:', e.message);
        }
        
        // Mapear usuários com suas fotos disponíveis
        const avatarsDisponiveis = [
            {
                nome: 'Clemerson',
                email: 'clemerson.silva@aluforce.ind.br',
                foto: '/avatars/Clemerson.webp'
            },
            {
                nome: 'Thiago',
                email: 'thiago@aluforce.ind.br',
                foto: '/avatars/Thiago.webp'
            }
        ];
        
        console.log('📸 CONFIGURANDO AVATARES:');
        console.log('='.repeat(50));
        
        let sucessos = 0;
        let erros = 0;
        
        for (const avatar of avatarsDisponiveis) {
            try {
                console.log(`🔄 Configurando avatar para: ${avatar.nome} (${avatar.email})`);
                
                // Verificar se usuário existe
                const [usuario] = await connection.execute(
                    'SELECT id, nome FROM usuarios_pcp WHERE email = ',
                    [avatar.email]
                );
                
                if (usuario.length > 0) {
                    // Atualizar foto do usuário
                    await connection.execute(
                        'UPDATE usuarios_pcp SET foto_url =  WHERE email = ',
                        [avatar.foto, avatar.email]
                    );
                    
                    console.log(`   ✅ Avatar configuração: ${avatar.foto}`);
                    sucessos++;
                } else {
                    console.log(`   ⚠️ Usuário não encontração: ${avatar.email}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Erro ao configurar ${avatar.email}: ${error.message}`);
                erros++;
            }
        }
        
        // Configurar avatares automáticos para outros usuários
        console.log('\n🤖 CONFIGURANDO AVATARES AUTOMÁTICOS:');
        console.log('='.repeat(50));
        
        const [usuariosSemFoto] = await connection.execute(`
            SELECT id, nome, email 
            FROM usuarios_pcp 
            WHERE (foto_url IS NULL OR foto_url = '') 
            AND nome IS NOT NULL 
            AND nome != ''
        `);
        
        for (const usuario of usuariosSemFoto) {
            try {
                // Gerar URL do avatar baseação no nome
                const nomeSimplificação = usuario.nome
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');
                
                const avatarUrl = `/avatars/${nomeSimplificação}.webp`;
                
                await connection.execute(
                    'UPDATE usuarios_pcp SET foto_url =  WHERE id = ',
                    [avatarUrl, usuario.id]
                );
                
                console.log(`   🔄 Avatar automático: ${usuario.nome} → ${avatarUrl}`);
                sucessos++;
                
            } catch (error) {
                console.log(`   ❌ Erro avatar automático ${usuario.nome}: ${error.message}`);
                erros++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 RELATÓRIO FINAL DE AVATARES');
        console.log('='.repeat(60));
        console.log(`✅ Avatares configuraçãos: ${sucessos}`);
        console.log(`❌ Erros encontraçãos: ${erros}`);
        
        // Mostrar status final de todos os usuários
        const [todosUsuarios] = await connection.execute(`
            SELECT id, nome, email, foto_url 
            FROM usuarios_pcp 
            ORDER BY nome
        `);
        
        console.log('\n👥 USUÁRIOS COM AVATARES:');
        console.log('='.repeat(50));
        todosUsuarios.forEach((user, index) => {
            const foto = user.foto_url  `📸 ${user.foto_url}` : '👤 Avatar padrão';
            console.log(`${index + 1}. ${user.nome} (${user.email})`);
            console.log(`   ${foto}`);
        });
        
        // Verificar quais fotos existem fisicamente
        console.log('\n📁 VERIFICAÇÃO DE ARQUIVOS:');
        console.log('='.repeat(50));
        
        const fs = require('fs');
        const path = require('path');
        
        try {
            const avatarDir = path.join(__dirname, 'avatars');
            const arquivos = fs.readdirSync(avatarDir);
            
            console.log('📂 Arquivos na pasta avatars:');
            arquivos.forEach(arquivo => {
                const stats = fs.statSync(path.join(avatarDir, arquivo));
                const tamanho = (stats.size / 1024).toFixed(1);
                console.log(`   📸 ${arquivo} (${tamanho} KB)`);
            });
            
            // Verificar quais usuários têm foto física
            console.log('\n🔍 Status dos avatares:');
            for (const user of todosUsuarios) {
                if (user.foto_url) {
                    const nomeArquivo = user.foto_url.replace('/avatars/', '');
                    const existe = arquivos.includes(nomeArquivo);
                    const status = existe  '✅ Existe' : '❌ Arquivo não encontração';
                    console.log(`   ${user.nome}: ${status}`);
                }
            }
            
        } catch (error) {
            console.log(`⚠️ Erro ao verificar arquivos: ${error.message}`);
        }
        
        console.log('\n🎉 Configuração de avatares concluída!');
        
    } catch (error) {
        console.error('❌ Erro durante configuração:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexão com banco encerrada');
        }
    }
}

configurarAvatares();