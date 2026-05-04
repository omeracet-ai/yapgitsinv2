const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hizmet_db.sqlite');
db.get("SELECT id, fullName, email, phoneNumber, role, tokenBalance, identityVerified FROM users WHERE role='admin' LIMIT 1", function(e, r) {
  if (e) { console.log('HATA:', e.message); db.close(); return; }
  if (!r) { console.log('Admin bulunamadi!'); db.close(); return; }
  console.log('ID:', r.id);
  console.log('Ad:', r.fullName);
  console.log('Email:', r.email);
  console.log('Telefon:', r.phoneNumber);
  console.log('Rol:', r.role);
  console.log('Token:', r.tokenBalance);
  db.close();
});
