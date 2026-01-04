/**
 * Script para configurar permissões automaticamente
 */

const http = require('http');

async function login() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            email: 'ti@aluforce.ind.br',
            password: 'aluvendas01'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                const cookies = res.headers['set-cookie'];
                if (cookies) {
                    const authToken = cookies.find(c => c.startsWith('authToken='));
                    if (authToken) {
                        const token = authToken.split(';')[0].split('=')[1];
                        resolve(token);
                        return;
                    }
                }
                reject(new Error('Token não encontrado'));
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function configurePermissions(token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/configure-vendas-permissions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `authToken=${token}`
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    resolve(data);
                } catch (e) {
                    reject(new Error('Erro ao parsear resposta: ' + body));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function main() {
    console.log('🔐 Fazendo login...');
    
    try {
        const token = await login();
        console.log('✅ Login realização com sucesso');
        
        console.log('\n⚙️  Configurando permissões de vendas...\n');
        
        const result = await configurePermissions(token);
        
        if (result.success) {
            console.log('✅ Permissões configuradas com sucesso!\n');
            console.log('📊 Resultados:\n');
            
            result.results.forEach(r => {
                let status = '';
                switch(r.status) {
                    case 'success':
                        status = `✅ Atualização (${r.affected} registros)`;
                        break;
                    case 'not_found':
                        status = '⚠️  Usuário não encontrado no banco';
                        break;
                    case 'error':
                        status = `❌ Erro: ${r.message}`;
                        break;
                }
                console.log(`  ${r.email.padEnd(30)} - ${status}`);
            });
            
            console.log('\n✅ Configuração concluída!');
            console.log('🎯 Usuários com acesso ao módulo de Vendas foram atualizaçãos.');
            
        } else {
            console.error('❌ Erro:', result.error);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('\n💡 Certifique-se de que:');
        console.error('   1. O servidor está rodando na porta 3000');
        console.error('   2. As credenciais de admin estão corretas');
        process.exit(1);
    }
}

// Aguardar 3 segundos para o servidor iniciar
console.log('⏳ Aguardando servidor iniciar...');
setTimeout(main, 3000);
