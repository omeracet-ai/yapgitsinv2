const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/hizmet_db.sqlite');
const ids = [
  'aa000001-0000-0000-0000-000000000001',
  'aa000002-0000-0000-0000-000000000002',
  'aa000003-0000-0000-0000-000000000003',
  'ee000001-0000-0000-0000-000000000001',
  'ee000002-0000-0000-0000-000000000002'
];
ids.forEach(function(id) {
  db.run('DELETE FROM users WHERE id = ?', [id], function(e) {
    if (e) console.error('Hata:', id, e.message);
    else console.log('Silindi:', id, 'rows:', this.changes);
  });
});
setTimeout(function(){ db.close(); }, 1000);
