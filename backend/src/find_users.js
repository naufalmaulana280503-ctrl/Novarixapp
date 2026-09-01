const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const DB_PATH = path.join(__dirname, '..', 'data', 'novarix.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(()=>{
  db.all("SELECT id, username, display_name, email FROM users WHERE username LIKE '%Lucas%' OR display_name LIKE '%Lucas%' OR username LIKE '%N.%' OR display_name LIKE '%N.%' LIMIT 50", [], (err, rows)=>{
    if (err) { console.error(err); process.exit(1); }
    console.log('Found users:');
    console.log(rows);
    db.close();
  });
});
