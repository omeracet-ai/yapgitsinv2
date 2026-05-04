const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/hizmet_db.sqlite');
db.all("PRAGMA table_info(users)", function(e, rows) {
  if (e) { console.error(e.message); db.close(); return; }
  console.log('users columns:', rows.map(function(r){ return r.name; }).join(', '));
  db.close();
});
