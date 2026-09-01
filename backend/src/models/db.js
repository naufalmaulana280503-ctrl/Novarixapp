const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const { Pool: PgPool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || '';
const configuredDbPath = process.env.DB_PATH || path.join('data', 'novarix.db');
const DB_PATH = path.isAbsolute(configuredDbPath)
  ? configuredDbPath
  : path.resolve(__dirname, '..', '..', configuredDbPath);
const shouldUsePostgres = Boolean(DATABASE_URL) && /postgres(?:ql)?:\/\//i.test(DATABASE_URL);

let pgPool = null;
let isPostgresReady = false;

if (shouldUsePostgres) {
  pgPool = new PgPool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  pgPool.on('error', (err) => {
    console.error('Unexpected Postgres client error:', err);
    isPostgresReady = false;
  });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
    process.exit(1);
  }
  if (!shouldUsePostgres) {
    console.log('Connected to SQLite database:', DB_PATH);
  }
});

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const convertSqlitePlaceholdersToPostgres = (sql, params = []) => {
  if (!params.length) return { text: sql, values: [] };

  let idx = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;
  let text = '';

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];

    if (escaped) {
      text += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      text += ch;
      escaped = true;
      continue;
    }

    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      text += ch;
      continue;
    }

    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      text += ch;
      continue;
    }

    if (ch === '?' && !inSingleQuote && !inDoubleQuote) {
      idx += 1;
      text += `$${idx}`;
      continue;
    }

    text += ch;
  }

  return { text, values: params };
};

const splitSqlScript = (sqlScript) => {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < sqlScript.length; i += 1) {
    const ch = sqlScript[i];
    const prev = sqlScript[i - 1];

    if (ch === "'" && !inDoubleQuote) {
      if (prev !== '\\') inSingleQuote = !inSingleQuote;
      current += ch;
      continue;
    }

    if (ch === '"' && !inSingleQuote) {
      if (prev !== '\\') inDoubleQuote = !inDoubleQuote;
      current += ch;
      continue;
    }

    if (ch === ';' && !inSingleQuote && !inDoubleQuote) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);

  return statements;
};

const ensureInsertReturningId = (sqlText) => {
  const trimmed = sqlText.trim();
  if (!/^insert\s+/i.test(trimmed)) return sqlText;
  if (/returning\s+/i.test(trimmed)) return sqlText;
  return `${trimmed} RETURNING id`;
};

const pool = {
  query: async (sql, params = []) => {
    if (isPostgresReady && pgPool) {
      const { text, values } = convertSqlitePlaceholdersToPostgres(sql, params);
      const normalizedSql = /^insert\s+/i.test(sql.trim()) && !/returning\s+/i.test(sql.trim()) ? ensureInsertReturningId(text) : text;
      const result = await pgPool.query(normalizedSql, values);
      const trimmed = sql.trim().toLowerCase();

      if (trimmed.startsWith('select')) {
        return [result.rows];
      }
      if (trimmed.startsWith('insert')) {
        return [{ insertId: result.rows?.[0]?.id ?? result.rowCount, changes: result.rowCount }];
      }
      if (trimmed.startsWith('update') || trimmed.startsWith('delete')) {
        return [{ changes: result.rowCount }];
      }
      return [[]];
    }

    const trimmed = sql.trim().toLowerCase();
    if (trimmed.startsWith('select')) {
      const rows = await all(sql, params);
      return [rows];
    }
    if (trimmed.startsWith('insert')) {
      const result = await run(sql, params);
      return [{ insertId: result.lastID, changes: result.changes }];
    }
    if (trimmed.startsWith('update') || trimmed.startsWith('delete')) {
      const result = await run(sql, params);
      return [{ changes: result.changes }];
    }
    await run(sql, params);
    return [[]];
  }
};

const initializePostgresSchema = async () => {
  const migrationPath = path.join(__dirname, '..', '..', 'database', 'supabase', 'schema.sql');
  if (!fs.existsSync(migrationPath)) {
    return;
  }

  const sqlScript = fs.readFileSync(migrationPath, 'utf8');
  const statements = splitSqlScript(sqlScript);

  for (const statement of statements) {
    if (!statement.trim()) continue;
    try {
      await pgPool.query(statement);
    } catch (err) {
      // Ignore errors for already-existing objects (IF NOT EXISTS handles most)
      // But log unexpected errors for debugging
      if (!/already exists/i.test(err.message) && !/duplicate/i.test(err.message)) {
        console.warn('[schema] Statement warning:', err.message);
      }
    }
  }

  // Run ALTER TABLE migrations for new columns
  const alterStatements = [
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS video_url TEXT',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ',
    'ALTER TABLE reports ADD COLUMN IF NOT EXISTS target_message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS app_settings JSONB DEFAULT \'{}\'::jsonb',
    'ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls TEXT',
    'ALTER TABLE posts ADD COLUMN IF NOT EXISTS unlock_at TIMESTAMPTZ',
    'ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS business_verified BOOLEAN DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_invited_elite BOOLEAN DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_tier TEXT CHECK (verified_tier IN (\'blue\',\'gold\',\'purple\'))',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS current_mood TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS vibe_color TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expires TIMESTAMPTZ',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS genesis_badge BOOLEAN DEFAULT FALSE',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS document_url TEXT',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS document_name TEXT',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS document_size BIGINT',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS location_name TEXT',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS poll_id BIGINT',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_duration INTEGER',
    'ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()',
  ];

  for (const stmt of alterStatements) {
    try {
      await pgPool.query(stmt);
    } catch (err) {
      if (!/already exists|does not exist|does not have/i.test(err.message)) {
        console.warn('[schema-alter] Warning:', err.message);
      }
    }
  }

  // Ensure stories and story_views tables exist (may have been missed in schema.sql)
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS stories (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        media_url TEXT NOT NULL,
        media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'boomerang')),
        caption TEXT,
        duration_seconds INTEGER DEFAULT 15,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS story_views (
        id BIGSERIAL PRIMARY KEY,
        story_id BIGINT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        viewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        viewed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (story_id, viewer_id)
      )
    `);
    await pgPool.query('CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON story_views(viewer_id)');
  } catch (err) {
    console.warn('[schema-stories] Warning:', err.message);
  }

  // Ensure verification_requests, subscriptions, debates tables exist
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS verification_requests (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier TEXT NOT NULL CHECK (tier IN ('blue','gold','purple')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        document_path TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_by BIGINT REFERENCES users(id),
        reviewed_at TIMESTAMPTZ,
        admin_notes TEXT
      )
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT,
        plan TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','pending')),
        amount_usd NUMERIC(10,2),
        transaction_id TEXT,
        metadata JSONB,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS debates (
        id BIGSERIAL PRIMARY KEY,
        title TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        reveal_at TIMESTAMPTZ,
        created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS debate_participants (
        id BIGSERIAL PRIMARY KEY,
        debate_id BIGINT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        alias TEXT NOT NULL,
        is_revealed BOOLEAN DEFAULT FALSE,
        joined_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.warn('[schema-extra] Warning:', err.message);
  }

  console.log('Connected to Supabase/Postgres database via DATABASE_URL');
};

const initDatabase = async () => {
  if (shouldUsePostgres && pgPool) {
    try {
      await pgPool.query('SELECT 1');
      isPostgresReady = true;
      await initializePostgresSchema();
      return;
    } catch (err) {
      isPostgresReady = false;
      console.warn('DATABASE_URL detected but Postgres connection failed. Falling back to SQLite.', err.message);
    }
  }

  isPostgresReady = false;
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    await run('PRAGMA foreign_keys = ON');
    await run('BEGIN');

    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        phone TEXT,
        password_hash TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        bio TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'creator', 'admin', 'moderator', 'elite')),
        email_confirmed INTEGER DEFAULT 0,
        phone_confirmed INTEGER DEFAULT 0,
        confirmation_token TEXT,
        phone_verification_code TEXT,
        reset_token TEXT,
        reset_expires DATETIME,
        privacy_posts TEXT DEFAULT 'public' CHECK (privacy_posts IN ('public', 'close_friends', 'private')),
        is_bot_banned INTEGER DEFAULT 0,
        bot_ban_reason TEXT,
        followers_count INTEGER DEFAULT 0,
        following_count INTEGER DEFAULT 0,
        posts_count INTEGER DEFAULT 0,
        likes_received_count INTEGER DEFAULT 0,
        is_creator_eligible INTEGER DEFAULT 0,
        verified_badge TEXT CHECK (verified_badge IN ('sun', 'moon', 'star', NULL)),
        is_verified INTEGER DEFAULT 0,
        app_settings TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        caption TEXT,
        media_url TEXT NOT NULL,
        media_urls TEXT,
        media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
        duration INTEGER,
        width INTEGER,
        height INTEGER,
        fps INTEGER,
        privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'close_friends', 'private')),
        unlock_at DATETIME,
        is_locked INTEGER DEFAULT 0,
        watermark_applied INTEGER DEFAULT 0,
        has_reaction INTEGER DEFAULT 0,
        reaction_post_id INTEGER,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        shares_count INTEGER DEFAULT 0,
        reposts_count INTEGER DEFAULT 0,
        downloads_count INTEGER DEFAULT 0,
        is_nearby INTEGER DEFAULT 0,
        location_name TEXT,
        latitude REAL,
        longitude REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        parent_id INTEGER,
        text TEXT,
        voice_url TEXT,
        image_url TEXT,
        sticker_id TEXT,
        gift_sticker_id TEXT,
        is_pinned INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry', 'duet', 'react_video')),
        reaction_media_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, post_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS gifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price_usd REAL NOT NULL,
        admin_fee_usd REAL DEFAULT 0,
        tax_usd REAL DEFAULT 0,
        creator_receive_usd REAL DEFAULT 0,
        image_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS gift_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gift_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER,
        post_id INTEGER,
        comment_id INTEGER,
        amount_usd REAL NOT NULL,
        admin_fee_usd REAL NOT NULL,
        tax_usd REAL NOT NULL,
        creator_receive_usd REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gift_id) REFERENCES gifts(id),
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS stickers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        pack_name TEXT,
        image_url TEXT,
        is_gift INTEGER DEFAULT 0,
        price_usd REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS user_stickers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        sticker_id INTEGER NOT NULL,
        acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, sticker_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        is_close_friend INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS close_friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, friend_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        avatar_url TEXT,
        owner_id INTEGER NOT NULL,
        is_private INTEGER DEFAULT 0,
        invite_code TEXT UNIQUE,
        max_members INTEGER DEFAULT 35000000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS group_polls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        creator_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS group_poll_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        option_index INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (poll_id, user_id),
        FOREIGN KEY (poll_id) REFERENCES group_polls(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER,
        group_id INTEGER,
        text TEXT,
        voice_url TEXT,
        image_url TEXT,
        sticker_id TEXT,
        reply_to_id INTEGER,
        is_pinned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        caller_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        group_id INTEGER,
        type TEXT NOT NULL CHECK (type IN ('voice', 'video', 'screen')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ringing', 'accepted', 'rejected', 'ended', 'missed')),
        started_at DATETIME,
        ended_at DATETIME,
        duration_seconds INTEGER,
        screen_recording_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS ads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        media_url TEXT,
        target_date DATE NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'scheduled', 'active', 'completed')),
        fee_usd REAL DEFAULT 1000,
        impressions_target INTEGER DEFAULT 1000000,
        impressions_delivered INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_id INTEGER NOT NULL,
        target_user_id INTEGER,
        target_post_id INTEGER,
        target_group_id INTEGER,
        target_message_id INTEGER,
        reason TEXT NOT NULL,
        evidence_urls TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
        moderator_id INTEGER,
        action_taken TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (target_group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS bot_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        checks_run INTEGER DEFAULT 0,
        last_check_at DATETIME,
        is_flagged_bot INTEGER DEFAULT 0,
        flag_reason TEXT,
        auto_banned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS terms_acceptances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS watermarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        media_url TEXT NOT NULL,
        watermark_type TEXT DEFAULT 'permanent' CHECK (watermark_type IN ('temporary', 'permanent')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comment_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (comment_id, user_id),
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run('CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)');
    await run('CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_gifts_active ON gifts(is_active)');
    await run('CREATE INDEX IF NOT EXISTS idx_gift_transactions_receiver ON gift_transactions(receiver_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_calls_receiver ON calls(receiver_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_ads_creator ON ads(creator_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_bot_checks_user ON bot_checks(user_id)');

    // Stories & Boomerang tables for SQLite
    await run(`
      CREATE TABLE IF NOT EXISTS stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        media_url TEXT NOT NULL,
        media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'boomerang')),
        caption TEXT,
        duration_seconds INTEGER DEFAULT 15,
        views_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS story_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL,
        viewer_id INTEGER NOT NULL,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (story_id, viewer_id),
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
        FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS post_reposts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_post_id INTEGER NOT NULL,
        repost_by_user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (original_post_id, repost_by_user_id),
        FOREIGN KEY (original_post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (repost_by_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run('CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at)');
    await run('CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON story_views(viewer_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_post_reposts_original ON post_reposts(original_post_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_post_reposts_user ON post_reposts(repost_by_user_id)');

    // Add columns that may be missing in older SQLite databases
    const sqliteAlterCols = [
      { table: 'users', col: 'verified_badge', def: 'TEXT' },
      { table: 'users', col: 'is_verified', def: 'INTEGER DEFAULT 0' },
      { table: 'users', col: 'app_settings', def: "TEXT DEFAULT '{}'" },
      { table: 'posts', col: 'media_urls', def: 'TEXT' },
      { table: 'posts', col: 'unlock_at', def: 'DATETIME' },
      { table: 'posts', col: 'is_locked', def: 'INTEGER DEFAULT 0' },
      { table: 'messages', col: 'document_url', def: 'TEXT' },
      { table: 'messages', col: 'document_name', def: 'TEXT' },
      { table: 'messages', col: 'document_size', def: 'INTEGER' },
      { table: 'messages', col: 'location_name', def: 'TEXT' },
      { table: 'messages', col: 'latitude', def: 'REAL' },
      { table: 'messages', col: 'longitude', def: 'REAL' },
      { table: 'messages', col: 'poll_id', def: 'INTEGER' },
      { table: 'messages', col: 'voice_duration', def: 'INTEGER' },
      { table: 'messages', col: 'video_url', def: 'TEXT' },
      { table: 'messages', col: 'edited_at', def: 'DATETIME' },
      { table: 'messages', col: 'deleted_at', def: 'DATETIME' },
      { table: 'reports', col: 'target_message_id', def: 'INTEGER' },
      { table: 'users', col: 'is_premium', def: 'INTEGER DEFAULT 0' },
      { table: 'users', col: 'premium_expires', def: 'DATETIME' },
      { table: 'users', col: 'theme', def: 'TEXT' },
      { table: 'users', col: 'genesis_badge', def: 'INTEGER DEFAULT 0' },
    ];

    for (const { table, col, def } of sqliteAlterCols) {
      try {
        await run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      } catch (err) {
        if (!/duplicate column/i.test(err.message)) throw err;
      }
    }

    // Verification requests table
    await run(`
      CREATE TABLE IF NOT EXISTS verification_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tier TEXT NOT NULL CHECK (tier IN ('blue','gold','purple')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        document_path TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INTEGER,
        reviewed_at DATETIME,
        admin_notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Subscriptions table
    await run(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        provider TEXT,
        plan TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','pending')),
        amount_usd REAL,
        transaction_id TEXT,
        metadata TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Debates
    await run(`
      CREATE TABLE IF NOT EXISTS debates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        reveal_at DATETIME,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS debate_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debate_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        alias TEXT NOT NULL,
        is_revealed INTEGER DEFAULT 0,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON story_views(viewer_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_time_capsules_user_unlock ON time_capsules(user_id, unlock_at)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_anon_confessions_status_created ON anon_confessions(status, created_at DESC)`);

    await run('COMMIT');
    console.log('Database initialized successfully');
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }
};

module.exports = { db, pool, initDatabase };
