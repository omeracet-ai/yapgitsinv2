// Touch web.config on Plesk to force iisnode recycle.
// Reuses FTP creds from node-ftp-deploy.js env conventions.
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

function loadEnv(p) {
  const e = {};
  for (const line of fs.readFileSync(p, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) e[m[1]] = m[2].replace(/^"|"$/g, '').trim();
  }
  return e;
}
const env = loadEnv(path.resolve(__dirname, '../.env.deploy'));
const HOST = env.FTP_HOST;
const USER = env.FTP_USER;
const PASS = env.FTP_PASS;
const REMOTE = (env.FTP_REMOTE_DIR || '/httpdocs').replace(/\/$/, '');

(async () => {
  const client = new ftp.Client(15000);
  try {
    await client.access({ host: HOST, user: USER, password: PASS, secure: false });
    const local = path.join(__dirname, '..', 'nestjs-backend', 'web.config');
    await client.uploadFrom(local, `${REMOTE}/backend/web.config`);
    console.log('✓ web.config re-uploaded');
  } catch (e) {
    console.error('FAIL:', e.message);
    process.exit(1);
  } finally {
    client.close();
  }
})();
