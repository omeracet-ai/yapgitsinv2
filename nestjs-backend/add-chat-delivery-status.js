const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use the same database path as the application
const dbPath = path.join(__dirname, 'hizmet_db.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

const migrations = [
  // Add jobLeadId column for job lead context
  {
    sql: `ALTER TABLE chat_messages ADD COLUMN jobLeadId VARCHAR(36)`,
    name: 'Add jobLeadId column',
  },
  // Add delivery status columns
  {
    sql: `ALTER TABLE chat_messages ADD COLUMN deliveryStatus VARCHAR(20) DEFAULT 'sent'`,
    name: 'Add deliveryStatus column',
  },
  {
    sql: `ALTER TABLE chat_messages ADD COLUMN deliveryFailureReason VARCHAR(500)`,
    name: 'Add deliveryFailureReason column',
  },
  // Add indexes for performance
  {
    sql: `CREATE INDEX IF NOT EXISTS idx_chat_messages_from ON chat_messages(from)`,
    name: 'Add from index',
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS idx_chat_messages_to ON chat_messages(to)`,
    name: 'Add to index',
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS idx_chat_messages_from_to_created ON chat_messages(from, to, createdAt DESC)`,
    name: 'Add from_to_created index',
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS idx_chat_messages_jobLeadId ON chat_messages(jobLeadId)`,
    name: 'Add jobLeadId index',
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS idx_chat_messages_createdAt ON chat_messages(createdAt DESC)`,
    name: 'Add createdAt index',
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS idx_chat_messages_to_readAt ON chat_messages(to, readAt)`,
    name: 'Add to_readAt index for unread queries',
  },
];

let completed = 0;

migrations.forEach((migration) => {
  db.run(migration.sql, (err) => {
    if (err) {
      if (err.message.includes('duplicate column')) {
        console.log(`⊘ ${migration.name} (already exists)`);
      } else if (err.message.includes('already exists')) {
        console.log(`⊘ ${migration.name} (already exists)`);
      } else {
        console.error(`✗ ${migration.name}: ${err.message}`);
      }
    } else {
      console.log(`✓ ${migration.name}`);
    }

    completed++;
    if (completed === migrations.length) {
      console.log('\nMigration complete!');
      db.close();
    }
  });
});
