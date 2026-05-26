// Node.js FTP deploy — basic-ftp with .env.deploy credentials.
// Used when PowerShell 5.1 FtpWebRequest fails ("Bu metot desteklenmiyor").
//
// Usage:
//   node scripts/node-ftp-deploy.js                  # all 3 (backend/admin/web)
//   node scripts/node-ftp-deploy.js backend          # only backend dist
//   node scripts/node-ftp-deploy.js --dry-run        # plan only

const path = require('path');
const fs = require('fs');
const ftp = require('basic-ftp');

// --- Load .env.deploy
function loadEnv(p) {
  const env = {};
  for (const line of fs.readFileSync(p, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '').trim();
  }
  return env;
}
const env = loadEnv(path.resolve(__dirname, '../.env.deploy'));
['FTP_HOST', 'FTP_USER', 'FTP_PASS', 'FTP_REMOTE_DIR'].forEach((k) => {
  if (!env[k]) throw new Error(`env eksik: ${k}`);
});

const HOST = env.FTP_HOST;
const USER = env.FTP_USER;
const PASS = env.FTP_PASS;
const PORT = parseInt(env.FTP_PORT || '21', 10);
const REMOTE = env.FTP_REMOTE_DIR.replace(/\/$/, '');
const SECURE = env.FTP_USE_TLS === '1' || env.FTP_USE_TLS === 'true';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = args.find((a) => !a.startsWith('--')) || 'all';

// --- Map local → remote
const REPO = path.resolve(__dirname, '..');
const targets = {
  backend: {
    local: path.join(REPO, 'nestjs-backend/dist'),
    remote: `${REMOTE}/backend`,
    description: 'NestJS dist (compiled)',
  },
  admin: {
    local: path.join(REPO, 'admin-panel/dist/standalone'),
    remote: `${REMOTE}/admin`,
    description: 'Next.js admin standalone',
  },
  web: {
    local: path.join(REPO, 'web/out'),
    remote: REMOTE,
    description: 'Next.js web static export (kök httpdocs)',
  },
};

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

async function uploadOne(client, spec) {
  console.log(`\n── ${spec.description} ──`);
  console.log(`   local : ${spec.local}`);
  console.log(`   remote: ${spec.remote}/`);
  if (!fs.existsSync(spec.local)) {
    console.log('   ⚠ klasör yok, atlanıyor');
    return { ok: 0, fail: 0, skipped: true };
  }
  const files = walk(spec.local);
  console.log(`   ${files.length} dosya`);
  if (dryRun) return { ok: files.length, fail: 0, dryRun: true };

  let ok = 0, fail = 0;
  for (const local of files) {
    const rel = path.relative(spec.local, local).replace(/\\/g, '/');
    const remote = `${spec.remote}/${rel}`;
    const dir = remote.substring(0, remote.lastIndexOf('/'));
    try {
      await client.ensureDir(dir);
      await client.uploadFrom(local, remote);
      ok++;
      if (ok % 50 === 0) process.stdout.write(`     [${ok}/${files.length}]\n`);
    } catch (e) {
      fail++;
      console.log(`     FAIL ${rel} - ${e.message?.slice(0, 80) ?? e}`);
    }
  }
  console.log(`   ✓ ${ok}/${files.length} (fail: ${fail})`);
  return { ok, fail };
}

(async () => {
  const client = new ftp.Client(60_000);
  client.ftp.verbose = false;
  try {
    if (!dryRun) {
      await client.access({
        host: HOST,
        port: PORT,
        user: USER,
        password: PASS,
        secure: SECURE,
        secureOptions: { rejectUnauthorized: false },
      });
      console.log(`Connected → ${HOST}:${PORT} (TLS: ${SECURE})`);
    } else {
      console.log('[DRY-RUN] connect atlandı');
    }

    const picks =
      target === 'all'
        ? ['backend', 'admin', 'web']
        : [target];

    const results = {};
    for (const t of picks) {
      results[t] = await uploadOne(client, targets[t]);
    }

    // Restart trigger
    if (!dryRun && (target === 'all' || target === 'backend')) {
      try {
        const tmpFile = path.join(__dirname, '..', '.tmp-restart.txt');
        fs.writeFileSync(tmpFile, new Date().toISOString());
        await client.ensureDir(`${REMOTE}/backend/tmp`);
        await client.uploadFrom(tmpFile, `${REMOTE}/backend/tmp/restart.txt`);
        fs.unlinkSync(tmpFile);
        console.log('\n✓ restart.txt touched (iisnode recycle)');
      } catch (e) {
        console.log(`\n⚠ restart.txt FAIL - manual restart: ${e.message}`);
      }
    }

    console.log('\n=== SUMMARY ===');
    for (const [t, r] of Object.entries(results)) {
      console.log(`  ${t.padEnd(8)}: ok=${r.ok ?? 0} fail=${r.fail ?? 0}${r.skipped ? ' (skip)' : ''}${r.dryRun ? ' (dry-run)' : ''}`);
    }
  } finally {
    client.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
