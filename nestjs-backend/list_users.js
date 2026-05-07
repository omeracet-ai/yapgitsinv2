const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'hizmet_db.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT fullName, email, role FROM users LIMIT 20", function(e, rows) {
  if (e) { console.error(e.message); db.close(); return; }
  console.log('User list:');
  rows.forEach(r => console.log(`- ${r.fullName} (${r.email}) [${r.role}]`));
  db.close();
});
