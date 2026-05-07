const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'hizmet_db.sqlite');
console.log('Opening database at:', dbPath);
const db = new sqlite3.Database(dbPath);

db.get("SELECT * FROM users WHERE email = 'ayse@v2.com'", function(e, row) {
  if (e) { 
    console.error('Error:', e.message); 
    db.close(); 
    return; 
  }
  if (row) {
    console.log('SUCCESS: User found');
    console.log('ID:', row.id);
    console.log('Full Name:', row.fullName);
    console.log('Role:', row.role);
  } else {
    console.log('FAILURE: User not found in database');
  }
  db.close();
});
