const bcrypt = require('bcryptjs');
const { pool, initDatabase } = require('./models/db');

const USERNAME = 'Christian N. Lucas Sterling';
const DISPLAY = 'Christian N. Lucas Sterling';
const PASSWORD = 'CNLS282226';
const FOLLOWERS = 30000000;
const LIKES = 30000000;
const ROLE = 'elite';
const GIVE_GENESIS = true;

(async () => {
  try {
    await initDatabase();

    // Ensure unique
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR display_name = $1 LIMIT 1',
      [USERNAME]
    );
    if (existing.length > 0) {
      console.error('User with same username/display name already exists, id=', existing[0].id);
      process.exit(1);
    }

    const pwHash = bcrypt.hashSync(PASSWORD, 12);
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const sql = `INSERT INTO users (
      email, phone, password_hash, username, display_name, avatar_url, bio, role,
      email_confirmed, phone_confirmed, privacy_posts, is_bot_banned,
      followers_count, following_count, posts_count, likes_received_count,
      is_creator_eligible, verified_badge, is_verified, created_at, updated_at,
      theme, genesis_badge, is_premium, premium_expires
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`;

    const [result] = await pool.query(sql, [
      null, null, pwHash, USERNAME, DISPLAY, null, 'Founder account', ROLE,
      true, false, 'public', false,
      FOLLOWERS, 0, 0, LIKES,
      true, null, false, now.toISOString(), now.toISOString(),
      'obsidian-gold', GIVE_GENESIS, GIVE_GENESIS, expires.toISOString(),
    ]);

    const newId = result.insertId;
    console.log('Created new user id=', newId);

    // Create subscription record
    const txnId = 'manual_migration_' + Date.now();
    await pool.query(
      `INSERT INTO subscriptions (user_id, provider, plan, status, amount_usd, transaction_id, metadata, started_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
      [newId, 'manual', 'monthly', 'active', 9.99, txnId, JSON.stringify({ note: 'migration created subscription' }), expires.toISOString()]
    );

    console.log('Done. Credentials: username/displayName=', USERNAME, 'password=', PASSWORD);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
