const bcrypt = require('bcryptjs');
const { pool, initDatabase } = require('./models/db');

const OLD_NAME = 'N. Lucas Sterling';
const NEW_USERNAME = 'Christian N. Lucas Sterling';
const NEW_DISPLAY = 'Christian N. Lucas Sterling';
const NEW_PASSWORD = 'CNLS282226';

(async () => {
  try {
    await initDatabase();

    // Find old user
    const [oldRows] = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR display_name = $1 LIMIT 1',
      [OLD_NAME]
    );
    if (oldRows.length === 0) {
      console.error('Old user not found:', OLD_NAME);
      process.exit(1);
    }
    const old = oldRows[0];
    const oldId = old.id;
    console.log('Found old user id=', oldId);

    // Check if new username already exists
    const [existingNew] = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR display_name = $1 LIMIT 1',
      [NEW_USERNAME]
    );
    if (existingNew.length > 0) {
      console.error('A user with the target username/display name already exists. Existing id=', existingNew[0].id);
      process.exit(1);
    }

    // Build insert
    const passwordHash = bcrypt.hashSync(NEW_PASSWORD, 12);
    const insertCols = [
      'email', 'phone', 'password_hash', 'username', 'display_name', 'avatar_url', 'bio', 'role',
      'email_confirmed', 'phone_confirmed', 'confirmation_token', 'phone_verification_code',
      'reset_token', 'reset_expires', 'privacy_posts', 'is_bot_banned', 'bot_ban_reason',
      'followers_count', 'following_count', 'posts_count', 'likes_received_count',
      'is_creator_eligible', 'verified_badge', 'is_verified', 'created_at', 'updated_at',
      'business_verified', 'is_partner', 'is_invited_elite', 'verified_tier',
      'current_mood', 'vibe_color', 'theme', 'genesis_badge', 'is_premium', 'premium_expires',
    ];

    const vals = insertCols.map((c) => (old[c] === undefined ? null : old[c]));
    // Override specific fields
    const pwIdx = insertCols.indexOf('password_hash');
    const usernameIdx = insertCols.indexOf('username');
    const displayIdx = insertCols.indexOf('display_name');
    const now = new Date().toISOString();
    const createdAtIndex = insertCols.indexOf('created_at');
    const updatedAtIndex = insertCols.indexOf('updated_at');

    vals[pwIdx] = passwordHash;
    vals[usernameIdx] = NEW_USERNAME;
    vals[displayIdx] = NEW_DISPLAY;
    if (createdAtIndex >= 0) vals[createdAtIndex] = now;
    if (updatedAtIndex >= 0) vals[updatedAtIndex] = now;

    const ph = insertCols.map((_, i) => `$${i + 1}`).join(',');
    const sqlInsert = `INSERT INTO users (${insertCols.join(',')}) VALUES (${ph})`;

    const [result] = await pool.query(sqlInsert, vals);
    const newId = result.insertId;
    console.log('Inserted new user id=', newId);

    // Migrate references
    const updates = [
      ['UPDATE posts SET user_id = $1 WHERE user_id = $2', [newId, oldId]],
      ['UPDATE comments SET user_id = $1 WHERE user_id = $2', [newId, oldId]],
      ['UPDATE reactions SET user_id = $1 WHERE user_id = $2', [newId, oldId]],
      ['UPDATE gift_transactions SET sender_id = $1 WHERE sender_id = $2', [newId, oldId]],
      ['UPDATE gift_transactions SET receiver_id = $1 WHERE receiver_id = $2', [newId, oldId]],
      ['UPDATE follows SET follower_id = $1 WHERE follower_id = $2', [newId, oldId]],
      ['UPDATE follows SET following_id = $1 WHERE following_id = $2', [newId, oldId]],
      ['UPDATE close_friends SET user_id = $1 WHERE user_id = $2', [newId, oldId]],
      ['UPDATE close_friends SET friend_id = $1 WHERE friend_id = $2', [newId, oldId]],
      ['UPDATE group_members SET user_id = $1 WHERE user_id = $2', [newId, oldId]],
      ['UPDATE groups SET owner_id = $1 WHERE owner_id = $2', [newId, oldId]],
      ['UPDATE group_polls SET creator_id = $1 WHERE creator_id = $2', [newId, oldId]],
      ['UPDATE messages SET sender_id = $1 WHERE sender_id = $2', [newId, oldId]],
      ['UPDATE messages SET receiver_id = $1 WHERE receiver_id = $2', [newId, oldId]],
      ['UPDATE calls SET caller_id = $1 WHERE caller_id = $2', [newId, oldId]],
      ['UPDATE calls SET receiver_id = $1 WHERE receiver_id = $2', [newId, oldId]],
      ['UPDATE reports SET reporter_id = $1 WHERE reporter_id = $2', [newId, oldId]],
      ['UPDATE reports SET target_user_id = $1 WHERE target_user_id = $2', [newId, oldId]],
      ['UPDATE reports SET moderator_id = $1 WHERE moderator_id = $2', [newId, oldId]],
      ['UPDATE verification_requests SET user_id = $1 WHERE user_id = $2', [newId, oldId]],
      ['UPDATE verification_requests SET reviewed_by = $1 WHERE reviewed_by = $2', [newId, oldId]],
      ['UPDATE debates SET created_by = $1 WHERE created_by = $2', [newId, oldId]],
      ['UPDATE debate_participants SET user_id = $1 WHERE user_id = $2', [newId, oldId]],
      ['UPDATE sessions SET user_id = $1 WHERE user_id = $2', [newId, oldId]],
      ['UPDATE terms_acceptances SET user_id = $1 WHERE user_id = $2', [newId, oldId]],
      ['UPDATE bot_checks SET user_id = $1 WHERE user_id = $2', [newId, oldId]],
      ['UPDATE user_stickers SET user_id = $1 WHERE user_id = $2', [newId, oldId]],
    ];

    for (const [sql, params] of updates) {
      try {
        await pool.query(sql, params);
        console.log('Executed:', sql);
      } catch (e) {
        console.warn('Update failed (continuing):', sql, e.message);
      }
    }

    // Delete old user
    await pool.query('DELETE FROM users WHERE id = $1', [oldId]);
    console.log('Deleted old user id=', oldId);

    console.log('Migration completed successfully. New user id=', newId);
    console.log('Credentials: username/displayName=', NEW_USERNAME, 'password=', NEW_PASSWORD);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();
