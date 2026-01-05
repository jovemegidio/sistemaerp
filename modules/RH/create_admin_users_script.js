// Script Node.js para criar usuários administrativos diretamente no banco de dados
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

// Configuração do banco de dados (use as mesmas credenciais do server.js)
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',  
  password: process.env.DB_PASS || '@dminalu',
  database: process.env.DB_NAME || 'aluforce_vendas',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306
});

const adminUsers = [
  { 
    name: 'Andreia Silva', 
    email: 'andreia@aluforce.ind.br', 
    role: 'rh',
    cargo: 'Analista de RH',
    departamento: 'Recursos Humanos',
    cpf: '11111111111'
  },
  { 
    name: 'RH Administrativo', 
    email: 'rh@aluforce.ind.br', 
    role: 'rh',
    cargo: 'Coordenaçãor de RH', 
    departamento: 'Recursos Humanos',
    cpf: '22222222222'
  },
  { 
    name: 'TI Suporte', 
    email: 'ti@aluforce.ind.br', 
    role: 'analista de t.i',
    cargo: 'Analista de TI',
    departamento: 'Tecnologia da Informação', 
    cpf: '33333333333'
  },
  { 
    name: 'Douglas Santos', 
    email: 'douglas@aluforce.ind.br', 
    role: 'diretoria',
    cargo: 'Diretor',
    departamento: 'Diretoria',
    cpf: '44444444444'
  },
  { 
    name: 'Hellen Costa', 
    email: 'hellen@aluforce.ind.br', 
    role: 'rh',
    cargo: 'Analista de RH Sênior',
    departamento: 'Recursos Humanos',
    cpf: '55555555555'
  },
  { 
    name: 'Junior Tech', 
    email: 'junior@aluforce.ind.br', 
    role: 'ti',
    cargo: 'Técnico de TI',
    departamento: 'Tecnologia da Informação',
    cpf: '66666666666'
  }
];

async function createAdminUsers() {
  try {
    console.log('Conectando ao banco de dados...');
    
    // Hash da senha padrão
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    console.log('Senha hashada:', hashedPassword);

    // Conectar ao banco
    await new Promise((resolve, reject) => {
      db.connect((err) => {
        if (err) {
          console.error('Erro ao conectar ao banco:', err);
          reject(err);
        } else {
          console.log('Conectação ao banco MySQL com sucesso!');
          resolve();
        }
      });
    });

    // Deletar usuários existentes primeiro (para evitar duplicatas)
    const deleteEmails = adminUsers.map(u => u.email);
    const deleteSql = `DELETE FROM funcionarios WHERE email IN (${deleteEmails.map(() => '').join(',')})`;
    
    await new Promise((resolve, reject) => {
      db.query(deleteSql, deleteEmails, (err, result) => {
        if (err) {
          console.warn('Aviso ao deletar usuários existentes:', err.message);
        } else {
          console.log(`${result.affectedRows} usuários existentes removidos`);
        }
        resolve(); // Continue mesmo se der erro na deleção
      });
    });

    // Inserir cada usuário
    const insertSql = `INSERT INTO funcionarios (
      nome_completo, email, senha, role, cargo, departamento, cpf, status, data_admissao
    ) VALUES (?, ?, ?, ?, , ?, ?, 'Ativo', CURDATE())`;

    for (const user of adminUsers) {
      try {
        await new Promise((resolve, reject) => {
          db.query(insertSql, [
            user.name,
            user.email,
            hashedPassword,
            user.role,
            user.cargo,
            user.departamento,
            user.cpf
          ], (err, result) => {
            if (err) {
              console.error(`Erro ao inserir ${user.email}:`, err.message);
              reject(err);
            } else {
              console.log(`✅ Usuário ${user.email} criado com ID ${result.insertId}`);
              resolve();
            }
          });
        });
      } catch (err) {
        console.error(`❌ Falha ao criar ${user.email}:`, err.message);
      }
    }

    // Verificar os usuários criados
    console.log('\n📋 Verificando usuários criados:');
    const selectSql = `SELECT id, nome_completo, email, role, cargo, status 
                       FROM funcionarios 
                       WHERE email IN (${deleteEmails.map(() => '').join(',')})
                       ORDER BY email`;
    
    await new Promise((resolve, reject) => {
      db.query(selectSql, deleteEmails, (err, results) => {
        if (err) {
          reject(err);
        } else {
          console.table(results);
          resolve();
        }
      });
    });

    console.log('\n🎉 Processo concluído!');
    console.log('Senha padrão para todos os usuários: admin123');
    console.log('\n📝 Usuários que devem ter acesso ao areaadm.html:');
    adminUsers.forEach(user => {
      console.log(`- ${user.email} (role: ${user.role})`);
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    db.end();
    process.exit(0);
  }
}

// Executar o script
createAdminUsers();