const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
function loadEnv(p) {
  const env = {};
  for (const line of fs.readFileSync(p, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '').trim();
  }
  return env;
}
const env = loadEnv(path.resolve(__dirname, '../.env.deploy'));
(async () => {
  const client = new ftp.Client();
  await client.access({ host: env.FTP_HOST, port: parseInt(env.FTP_PORT), user: env.FTP_USER, password: env.FTP_PASS, secure: false });
  try {
    const REMOTE = env.FTP_REMOTE_DIR.replace(/\/$/, '');
    const dir = `${REMOTE}/backend/iisnode`;
    console.log('Listing', dir);
    const list = await client.list(dir);
    console.log('found', list.length, 'entries');
    const sorted = list.sort((a,b) => (b.modifiedAt||0)-(a.modifiedAt||0));
    for (const f of sorted.slice(0, 5)) console.log(' ', f.name, f.size, f.modifiedAt);
    // download recent stdout/stderr (txt) files
    const txts = sorted.filter(f => f.name.endsWith('.txt')).slice(0, 4);
    for (const f of txts) {
      const out = path.join(__dirname, '..', '.tmp-' + f.name);
      await client.downloadTo(out, `${dir}/${f.name}`);
      console.log('  ↓', f.name);
    }
  } finally { client.close(); }
})().catch(e => { console.error(e); process.exit(1); });
