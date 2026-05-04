const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/hizmet_db.sqlite');
db.all("SELECT id, fullName, email, phoneNumber, passwordHash FROM users WHERE email LIKE '%v2.test%' OR email LIKE '%test.com%' LIMIT 10", function(e, rows) {
  if (e) { console.error(e.message); }
  else rows.forEach(function(r){ console.log(r.fullName, '|', r.email, '|', r.phoneNumber, '|', r.passwordHash.slice(0,20)+'...'); });
  db.close();
});
