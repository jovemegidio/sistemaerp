const fetch = require('node-fetch');
const BASE = process.env.API_BASE_URL || 'http://localhost:3000';
(async () => {
  try {
    const res = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'simplesadmin@aluforce.ind.br', password: 'admin123' })
    });
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('BODY:', text);
  } catch (err) {
    console.error('FETCH ERROR:', err);
  }
})();
