const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'novarix.db');

const USERNAME = 'Christian N. Lucas Sterling';
const DISPLAY = 'Christian N. Lucas Sterling';
const PASSWORD = 'CNLS282226';
const FOLLOWERS = 30000000;
const LIKES = 30000000;
const ROLE = 'elite';
const GIVE_GENESIS = true;

(async ()=>{
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.error('Database not found:', DB_PATH);
      process.exit(1);
    }
    const db = new sqlite3.Database(DB_PATH);
    const run = (sql, params=[]) => new Promise((res, rej)=> db.run(sql, params, function(err){ if(err) rej(err); else res(this); }));
    const get = (sql, params=[]) => new Promise((res, rej)=> db.get(sql, params, (err,row)=>{ if(err) rej(err); else res(row); }));

    // Ensure unique
    const existing = await get('SELECT id FROM users WHERE username = ? OR display_name = ? LIMIT 1', [USERNAME, DISPLAY]);
    if (existing) {
      console.error('User with same username/display name already exists, id=', existing.id);
      db.close();
      process.exit(1);
    }

    const backupPath = DB_PATH + '.backup_' + Date.now();
    fs.copyFileSync(DB_PATH, backupPath);
    console.log('Backup created at', backupPath);

    const pwHash = bcrypt.hashSync(PASSWORD, 12);
    const now = new Date();
    const expires = new Date(now.getTime() + 30*24*60*60*1000); // 30 days

    // Ensure additional premium/genesis columns exist; alter table if necessary
    const cols = await new Promise((res, rej)=> db.all("PRAGMA table_info(users);", [], (e,rows)=> e?rej(e):res(rows)));
    const colNames = cols.map(c=>c.name);
    const extras = [];
    if (!colNames.includes('theme')) extras.push("ALTER TABLE users ADD COLUMN theme TEXT");
    if (!colNames.includes('genesis_badge')) extras.push("ALTER TABLE users ADD COLUMN genesis_badge INTEGER DEFAULT 0");
    if (!colNames.includes('is_premium')) extras.push("ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 0");
    if (!colNames.includes('premium_expires')) extras.push("ALTER TABLE users ADD COLUMN premium_expires DATETIME");
    for (const a of extras) {
      try { await run(a); console.log('Added column via:', a); } catch(e) { console.warn('Could not add column', a, e.message); }
    }

    // Build insert using columns currently available + extras
    const finalCols = [
      'email','phone','password_hash','username','display_name','avatar_url','bio','role','email_confirmed','phone_confirmed','privacy_posts','is_bot_banned','followers_count','following_count','posts_count','likes_received_count','is_creator_eligible','verified_badge','is_verified','created_at','updated_at'
    ];
    if (colNames.includes('theme') || extras.some(x=>x.includes('theme'))) finalCols.push('theme');
    if (colNames.includes('genesis_badge') || extras.some(x=>x.includes('genesis_badge'))) finalCols.push('genesis_badge');
    if (colNames.includes('is_premium') || extras.some(x=>x.includes('is_premium'))) finalCols.push('is_premium');
    if (colNames.includes('premium_expires') || extras.some(x=>x.includes('premium_expires'))) finalCols.push('premium_expires');

    const insertVals = [null,null,pwHash,USERNAME,DISPLAY,null,'Founder account',ROLE,1,0,'public',0,FOLLOWERS,0,0,LIKES,1,null,0,now.toISOString(),now.toISOString()];
    if (finalCols.includes('theme')) insertVals.push('obsidian-gold');
    if (finalCols.includes('genesis_badge')) insertVals.push(GIVE_GENESIS?1:0);
    if (finalCols.includes('is_premium')) insertVals.push(GIVE_GENESIS?1:0);
    if (finalCols.includes('premium_expires')) insertVals.push(expires.toISOString());

    const placeholders = finalCols.map(()=>'?').join(',');
    const sql = `INSERT INTO users (${finalCols.join(',')}) VALUES (${placeholders})`;
    await run('BEGIN');
    const r = await run(sql, insertVals);
    const newId = r.lastID;
    console.log('Created new user id=', newId);

    // ensure subscriptions table exists
    try {
      await run(`CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        provider TEXT,
        plan TEXT,
        status TEXT DEFAULT 'active',
        amount_usd REAL,
        transaction_id TEXT,
        metadata TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      console.log('Ensured subscriptions table exists');
    } catch(e) { console.warn('Could not ensure subscriptions table', e.message); }

    // create subscription record
    const txnId = 'manual_migration_' + Date.now();
    await run('INSERT INTO subscriptions (user_id, provider, plan, status, amount_usd, transaction_id, metadata, started_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)', [newId, 'manual', 'monthly', 'active', 9.99, txnId, JSON.stringify({note:'migration created subscription'}), expires.toISOString()]);

    await run('COMMIT');
    db.close();
    console.log('Done. Credentials: username/displayName=', USERNAME, 'password=', PASSWORD);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
