const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/hizmet_db.sqlite');
db.all("SELECT id, fullName, email, phoneNumber, city, tokenBalance, asCustomerTotal, asWorkerTotal FROM users WHERE email LIKE '%v2.test%' ORDER BY email", function(e, rows) {
  if (e) { console.error(e.message); db.close(); return; }
  rows.forEach(function(r){
    console.log(r.fullName, '|', r.email, '|', r.id, '| tokens:', r.tokenBalance, '| cT:', r.asCustomerTotal, '| wT:', r.asWorkerTotal);
  });
  db.close();
});
