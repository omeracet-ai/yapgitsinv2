// One-shot: upload specific node_modules packages to prod backend.
// Usage: node scripts/upload-modules.js entities htmlparser2 body-parser raw-body iconv-lite
const path = require('path');
const fs = require('fs');
const ftp = require('basic-ftp');

function loadEnv(p) {
  const env = {};
  for (const line of fs.readFileSync(p, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '').trim();
  }
  return env;
}
const env = loadEnv(path.resolve(__dirname, '../.env.deploy'));
const REPO = path.resolve(__dirname, '..');
const REMOTE = env.FTP_REMOTE_DIR.replace(/\/$/, '');

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

(async () => {
  const targets = process.argv.slice(2);
  if (!targets.length) { console.error('usage: upload-modules.js pkg1 pkg2...'); process.exit(1); }

  const client = new ftp.Client(60_000);
  await client.access({
    host: env.FTP_HOST,
    port: parseInt(env.FTP_PORT || '21', 10),
    user: env.FTP_USER,
    password: env.FTP_PASS,
    secure: env.FTP_USE_TLS === '1' || env.FTP_USE_TLS === 'true',
    // TLS cert validation enabled (no rejectUnauthorized:false MITM risk).
    // If Plesk FTP cert is self-signed, add CA via NODE_EXTRA_CA_CERTS env.
  });
  console.log('Connected.');

  try {
    for (const pkg of targets) {
      const localDir = path.join(REPO, 'nestjs-backend', 'node_modules', pkg);
      const remoteDir = `${REMOTE}/backend/node_modules/${pkg}`;
      if (!fs.existsSync(localDir)) {
        console.log(`SKIP ${pkg} — not in local node_modules`);
        continue;
      }
      const files = walk(localDir);
      console.log(`\n${pkg}: ${files.length} files → ${remoteDir}`);
      let ok = 0, fail = 0;
      for (const local of files) {
        const rel = path.relative(localDir, local).replace(/\\/g, '/');
        const remote = `${remoteDir}/${rel}`;
        const dir = remote.substring(0, remote.lastIndexOf('/'));
        try {
          await client.ensureDir(dir);
          await client.uploadFrom(local, remote);
          ok++;
          if (ok % 25 === 0) process.stdout.write(`  [${ok}/${files.length}]\n`);
        } catch (e) {
          fail++;
          console.log(`  FAIL ${rel} - ${e.message?.slice(0, 80) ?? e}`);
        }
      }
      console.log(`  done ${pkg}: ok=${ok} fail=${fail}`);
    }

    // restart trigger
    const tmpFile = path.join(__dirname, '..', '.tmp-restart.txt');
    fs.writeFileSync(tmpFile, new Date().toISOString());
    await client.ensureDir(`${REMOTE}/backend/tmp`);
    await client.uploadFrom(tmpFile, `${REMOTE}/backend/tmp/restart.txt`);
    fs.unlinkSync(tmpFile);
    console.log('\n✓ restart.txt touched');
  } finally {
    client.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
