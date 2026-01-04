(async () => {
  const mysql = require('mysql2/promise');
  const bcrypt = require('bcrypt');
  const fs = require('fs');
  const http = require('http');

  const DB = {
    host: 'localhost',
    user: 'root',
    password: '@dminalu',
    database: 'aluforce_vendas'
  };

  const email = 'augusto.ladeira@aluforce.ind.br';
  const tempPassword = 'Temp@12345!';
  const backupFile = __dirname + `/${email.replace(/[@.]/g, '_')}-senha-backup.json`;

  const pool = mysql.createPool(DB);
  let originalHash = null;
  let userId = null;

  try {
    const [rows] = await pool.query('SELECT id, email, senha_hash FROM usuarios WHERE email =  LIMIT 1', [email]);
    if (rows.length === 0) {
      console.error('Usuário não encontrado:', email);
      process.exit(1);
    }
    userId = rows[0].id;
    originalHash = rows[0].senha_hash || null;

    // backup
    fs.writeFileSync(backupFile, JSON.stringify({ email, id: userId, originalHash, ts: new Date().toISOString() }, null, 2));
    console.log('Backup salvo em', backupFile);

    // gerar hash temporário e atualizar
    const newHash = await bcrypt.hash(tempPassword, 10);
    await pool.query('UPDATE usuarios SET senha_hash =  WHERE id = ', [newHash, userId]);
    console.log('Senha temporária aplicada para', email);

    // testar login via HTTP
    const postData = JSON.stringify({ email, password: tempPassword });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const resp = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(new Error('timeout')); });
      req.write(postData);
      req.end();
    });

    console.log('Resposta do servidor (status):', resp.statusCode);
    try {
      console.log('Body:', JSON.parse(resp.body));
    } catch (e) {
      console.log('Body (raw):', resp.body);
    }

  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
  } finally {
    try {
      // restaurar hash original
      await pool.query('UPDATE usuarios SET senha_hash =  WHERE id = ', [originalHash, userId]);
      console.log('Hash original restauração.');
    } catch (restoreErr) {
      console.error('Falha ao restaurar hash original:', restoreErr && restoreErr.message ? restoreErr.message : restoreErr);
      console.error('Backup está em:', backupFile);
    }
    await pool.end();
  }
})();
