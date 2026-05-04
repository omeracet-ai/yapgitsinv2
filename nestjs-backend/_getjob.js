const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/hizmet_db.sqlite');
db.get("SELECT id,title FROM jobs WHERE customerId='e92d4536-1687-4faa-b96d-106a088871da' AND status='completed' LIMIT 1", function(e,r){
  console.log(r.id + '|' + r.title); db.close();
});
