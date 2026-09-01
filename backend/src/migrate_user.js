const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'novarix.db');

const OLD_NAME = 'N. Lucas Sterling';
const NEW_USERNAME = 'Christian N. Lucas Sterling';
const NEW_DISPLAY = 'Christian N. Lucas Sterling';
const NEW_PASSWORD = 'CNLS282226';

(async () => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.error('Database not found at', DB_PATH);
      process.exit(1);
    }

    const backupPath = DB_PATH + '.backup_' + Date.now();
    fs.copyFileSync(DB_PATH, backupPath);
    console.log('Backup created at', backupPath);

    const db = new sqlite3.Database(DB_PATH);

    const run = (sql, params=[]) => new Promise((res, rej) => db.run(sql, params, function(err){ if(err) rej(err); else res(this); }));
    const get = (sql, params=[]) => new Promise((res, rej) => db.get(sql, params, (err,row)=> { if(err) rej(err); else res(row); }));
    const all = (sql, params=[]) => new Promise((res, rej) => db.all(sql, params, (err,rows)=> { if(err) rej(err); else res(rows); }));

    // Find old user by username or display_name
    const old = await get('SELECT * FROM users WHERE username = ? OR display_name = ? LIMIT 1', [OLD_NAME, OLD_NAME]);
    if (!old) {
      console.error('Old user not found:', OLD_NAME);
      db.close();
      process.exit(1);
    }
    const oldId = old.id;
    console.log('Found old user id=', oldId);

    // Check if new username already exists
    const existingNew = await get('SELECT * FROM users WHERE username = ? OR display_name = ? LIMIT 1', [NEW_USERNAME, NEW_DISPLAY]);
    if (existingNew) {
      console.error('A user with the target username/display name already exists. Aborting to avoid conflict. Existing id=', existingNew.id);
      db.close();
      process.exit(1);
    }

    // Prepare new user data by copying many attributes from old
    const passwordHash = bcrypt.hashSync(NEW_PASSWORD, 12);

    const insertCols = [
      'email','phone','password_hash','username','display_name','avatar_url','bio','role','email_confirmed','phone_confirmed','confirmation_token','phone_verification_code','reset_token','reset_expires','privacy_posts','is_bot_banned','bot_ban_reason','followers_count','following_count','posts_count','likes_received_count','is_creator_eligible','verified_badge','is_verified','created_at','updated_at','business_verified','is_partner','is_invited_elite','verified_tier','current_mood','vibe_color','theme','genesis_badge','is_premium','premium_expires'
    ];

    const vals = insertCols.map(c => old[c] === undefined ? null : old[c]);
    // override some fields
    vals[2] = passwordHash; // password_hash
    vals[3] = NEW_USERNAME; // username
    vals[4] = NEW_DISPLAY; // display_name
    // set created_at to now
    const now = new Date().toISOString();
    const createdAtIndex = insertCols.indexOf('created_at');
    const updatedAtIndex = insertCols.indexOf('updated_at');
    if (createdAtIndex >=0) vals[createdAtIndex] = now;
    if (updatedAtIndex >=0) vals[updatedAtIndex] = now;

    // Build insert SQL
    const placeholders = insertCols.map(()=>'?').join(',');
    const sqlInsert = `INSERT INTO users (${insertCols.join(',')}) VALUES (${placeholders})`;

    await run('BEGIN');
    const res = await run(sqlInsert, vals);
    const newId = res.lastID;
    console.log('Inserted new user id=', newId);

    // List of updates: each item is {sql, params}
    const updates = [
      // primary foreign keys
      {sql: 'UPDATE posts SET user_id = ? WHERE user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE comments SET user_id = ? WHERE user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE reactions SET user_id = ? WHERE user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE gift_transactions SET sender_id = ? WHERE sender_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE gift_transactions SET receiver_id = ? WHERE receiver_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE follows SET follower_id = ? WHERE follower_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE follows SET following_id = ? WHERE following_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE close_friends SET user_id = ? WHERE user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE close_friends SET friend_id = ? WHERE friend_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE group_members SET user_id = ? WHERE user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE groups SET owner_id = ? WHERE owner_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE group_polls SET creator_id = ? WHERE creator_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE messages SET sender_id = ? WHERE sender_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE messages SET receiver_id = ? WHERE receiver_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE calls SET caller_id = ? WHERE caller_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE calls SET receiver_id = ? WHERE receiver_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE reports SET reporter_id = ? WHERE reporter_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE reports SET target_user_id = ? WHERE target_user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE reports SET moderator_id = ? WHERE moderator_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE verification_requests SET user_id = ? WHERE user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE verification_requests SET reviewed_by = ? WHERE reviewed_by = ?', params: [newId, oldId]},
      {sql: 'UPDATE debates SET created_by = ? WHERE created_by = ?', params: [newId, oldId]},
      {sql: 'UPDATE debate_participants SET user_id = ? WHERE user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE sessions SET user_id = ? WHERE user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE terms_acceptances SET user_id = ? WHERE user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE bot_checks SET user_id = ? WHERE user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE user_stickers SET user_id = ? WHERE user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE group_members SET user_id = ? WHERE user_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE polls SET creator_id = ? WHERE creator_id = ?', params: [newId, oldId]},
      {sql: 'UPDATE gifts SET creator_id = ? WHERE creator_id = ?', params: [newId, oldId]}
    ];

    // Execute updates
    for (const u of updates) {
      try {
        await run(u.sql, u.params);
        console.log('Executed:', u.sql);
      } catch (e) {
        console.warn('Update failed (continuing):', u.sql, e.message);
      }
    }

    // Finally, delete old user
    await run('DELETE FROM users WHERE id = ?', [oldId]);
    console.log('Deleted old user id=', oldId);

    await run('COMMIT');
    db.close();
    console.log('Migration completed successfully. New user id=', newId);
    console.log('Credentials: username/displayName=', NEW_USERNAME, 'password=', NEW_PASSWORD);
  } catch (err) {
    console.error('Migration error:', err);
    try { 
      const db = new sqlite3.Database(DB_PATH);
      await new Promise((res,rej)=> db.run('ROLLBACK', (e)=> e?rej(e):res()));
      db.close();
    } catch(e){}
    process.exit(1);
  }
})();
