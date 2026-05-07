// DB-Agent Task 5: logical SQL dump (schema + data) for all tables.
// Tries mysqldump first; if missing, falls back to JS-based dump using mysql2.
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env.production.local', override: true });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

(async () => {
  const cfg = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 30000,
  };

  const backupDir = 'C:\\Users\\Equ\\AppData\\Local\\Temp\\db-backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(backupDir, `yapgitsin-${ts}.sql`);

  // Try mysqldump first
  let usedDump = false;
  try {
    const probe = spawnSync('mysqldump', ['--version'], { encoding: 'utf8' });
    if (probe.status === 0) {
      console.log('mysqldump available:', probe.stdout.trim());
      const args = [
        `-h${cfg.host}`, `-P${cfg.port}`, `-u${cfg.user}`, `-p${cfg.password}`,
        '--single-transaction', '--quick', '--default-character-set=utf8mb4',
        '--routines', '--triggers', '--add-drop-table', cfg.database,
      ];
      const r = spawnSync('mysqldump', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
      if (r.status === 0) {
        fs.writeFileSync(outFile, r.stdout, 'utf8');
        usedDump = true;
        console.log('Used: mysqldump');
      } else {
        console.log('mysqldump failed:', r.stderr?.slice(0, 500));
      }
    }
  } catch (e) {
    console.log('mysqldump probe error:', e.message);
  }

  if (!usedDump) {
    console.log('Falling back to JS-based dump');
    const conn = await mysql.createConnection(cfg);
    const out = fs.createWriteStream(outFile, { encoding: 'utf8' });
    const w = (s) => out.write(s);

    w(`-- DB-Agent JS dump\n-- Database: ${cfg.database}\n-- Timestamp: ${new Date().toISOString()}\n`);
    w(`SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\nSET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n\n`);

    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME`,
      [cfg.database]
    );

    function esc(v) {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      if (typeof v === 'boolean') return v ? '1' : '0';
      if (Buffer.isBuffer(v)) return '0x' + v.toString('hex');
      if (v instanceof Date) {
        const pad = (n) => String(n).padStart(2, '0');
        return `'${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())} ${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}:${pad(v.getUTCSeconds())}'`;
      }
      const s = String(v);
      return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\0/g, '\\0').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\x1a/g, '\\Z') + "'";
    }

    for (const row of tables) {
      const t = row.TABLE_NAME;
      const [createRows] = await conn.query(`SHOW CREATE TABLE \`${t}\``);
      const createSql = createRows[0]['Create Table'];
      w(`-- ----------------------------\n-- Table structure for ${t}\n-- ----------------------------\n`);
      w(`DROP TABLE IF EXISTS \`${t}\`;\n`);
      w(createSql + ';\n\n');

      const [data] = await conn.query(`SELECT * FROM \`${t}\``);
      if (data.length === 0) { w(`-- (no data in ${t})\n\n`); continue; }
      const cols = Object.keys(data[0]);
      const colList = cols.map((c) => `\`${c}\``).join(',');
      w(`-- Data for ${t} (${data.length} rows)\n`);
      const CHUNK = 200;
      for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        const values = chunk.map((r) => '(' + cols.map((c) => esc(r[c])).join(',') + ')').join(',\n  ');
        w(`INSERT INTO \`${t}\` (${colList}) VALUES\n  ${values};\n`);
      }
      w('\n');
    }

    w(`SET FOREIGN_KEY_CHECKS=1;\n-- end of dump\n`);
    await new Promise((res) => out.end(res));
    await conn.end();
    console.log('Used: JS-based dump');
  }

  const stat = fs.statSync(outFile);
  console.log(`\nBackup file: ${outFile}`);
  console.log(`Size: ${stat.size} bytes (${(stat.size / 1024).toFixed(2)} KB)`);
})().catch((e) => { console.error('ERR', e.code, e.message); process.exit(1); });
