// Voldi-db: promote omer.acet to admin + mint 1h admin JWT
// Reads JWT_SECRET from .env (not logged)
require('dotenv').config({ path: __dirname + '/../.env' });
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');

const DB_PATH = path.resolve(__dirname, '../hizmet_db.sqlite');
const TARGET_EMAIL = 'omer.acet@gmail.com';
const SECRET = process.env.JWT_SECRET;
if (!SECRET) { console.error('NO_JWT_SECRET'); process.exit(2); }

const db = new sqlite3.Database(DB_PATH);
const get = (sql, args=[]) => new Promise((res, rej) => db.get(sql, args, (e, r) => e?rej(e):res(r)));
const all = (sql, args=[]) => new Promise((res, rej) => db.all(sql, args, (e, r) => e?rej(e):res(r)));
const run = (sql, args=[]) => new Promise((res, rej) => db.run(sql, args, function(e){ e?rej(e):res(this); }));

(async () => {
  try {
    const cols = await all("PRAGMA table_info(users)");
    const hasRole = cols.some(c => c.name === 'role');
    console.log('HAS_ROLE_COL:', hasRole);

    const admins = await all("SELECT id, email, role FROM users WHERE role IN ('admin','super_admin')");
    console.log('EXISTING_ADMINS_COUNT:', admins.length);
    admins.forEach(a => console.log('  -', a.email, '(' + a.role + ')'));

    const hasTokenVersion = cols.some(c => c.name === 'tokenVersion');
    const hasTenantId = cols.some(c => c.name === 'tenantId');
    const selCols = ['id','email','role'];
    if (hasTenantId) selCols.push('tenantId');
    if (hasTokenVersion) selCols.push('tokenVersion');
    let user = await get(`SELECT ${selCols.join(',')} FROM users WHERE email = ?`, [TARGET_EMAIL]);
    console.log('OMER_BEFORE:', user ? JSON.stringify({email:user.email, role:user.role}) : 'NOT_FOUND');

    if (!user) {
      console.log('OMER_MISSING — listing top 5 users for context:');
      const top = await all("SELECT id, email, role FROM users LIMIT 10");
      top.forEach(u => console.log('  ', u.email, u.role));
      process.exit(3);
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      await run("UPDATE users SET role = 'admin', updatedAt = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
      user = await get(`SELECT ${selCols.join(',')} FROM users WHERE id = ?`, [user.id]);
      console.log('OMER_AFTER:', user.role);
    } else {
      console.log('OMER_ALREADY_ADMIN');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ?? null,
      tokenVersion: user.tokenVersion ?? 0,
    };
    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
    const outPath = path.resolve(__dirname, '../../.secrets/admin-token.txt');
    const decoded = jwt.decode(token);
    fs.writeFileSync(outPath, token + '\n', { mode: 0o600 });
    console.log('TOKEN_WRITTEN:', outPath);
    console.log('TOKEN_EXPIRES:', new Date(decoded.exp * 1000).toISOString());
    console.log('TOKEN_SUB:', decoded.sub, 'ROLE:', decoded.role);
    db.close();
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();
