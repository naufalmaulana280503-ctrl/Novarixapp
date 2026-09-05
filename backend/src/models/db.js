const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const { Pool } = require('pg');

// ─── PostgreSQL Connection ────────────────────────────────────────────────────
const buildDatabaseUrlFromParts = () => {
  const host = process.env.PGHOST || process.env.POSTGRES_HOST;
  const port = process.env.PGPORT || process.env.POSTGRES_PORT || '5432';
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB;
  const user = process.env.PGUSER || process.env.POSTGRES_USER;
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;

  if (!host || !database || !user || !password) return '';

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
};

const DATABASE_URL = process.env.DATABASE_URL
  || process.env.DATABASE_PUBLIC_URL
  || process.env.POSTGRES_URL
  || process.env.POSTGRES_URL_NON_POOLING
  || buildDatabaseUrlFromParts();

if (!DATABASE_URL) {
  console.error(
    '[FATAL] DATABASE_URL tidak dikonfigurasi. Link service PostgreSQL Railway ke backend atau set DATABASE_URL.'
  );
  process.exit(1);
}

const pgPool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pgPool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected pool error:', err.message);
});

// ─── Helper: Convert ? placeholders to $1, $2, ... (PostgreSQL style) ────────
const convertPlaceholders = (sql, params = []) => {
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

// ─── Helper: Auto-add RETURNING id to INSERT statements ──────────────────────
const ensureReturningId = (sqlText) => {
  const trimmed = sqlText.trim();
  if (!/^insert\s+/i.test(trimmed)) return sqlText;
  if (/returning\s+/i.test(trimmed)) return sqlText;
  return `${trimmed} RETURNING id`;
};

// ─── Query wrapper ───────────────────────────────────────────────────────────
// Maintains backward compatibility with existing controller code:
//   const [rows] = await pool.query('SELECT ...', params)      → rows = result.rows
//   const [result] = await pool.query('INSERT ...', params)    → result = { insertId, changes }
//   const [result] = await pool.query('UPDATE/DELETE ...', p)  → result = { changes }
const pool = {
  query: async (sql, params = []) => {
    const { text: convertedSql, values } = convertPlaceholders(sql, params);

    // Auto-add RETURNING id for INSERTs that don't have it
    const normalizedSql = /^insert\s+/i.test(sql.trim()) && !/returning\s+/i.test(sql.trim())
      ? ensureReturningId(convertedSql)
      : convertedSql;

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
    // CREATE TABLE, ALTER TABLE, etc.
    await pgPool.query(normalizedSql, values);
    return [[]];
  },
};

// ─── Schema Initialization ───────────────────────────────────────────────────
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

const initializeSchema = async () => {
  // 1. Run the main schema.sql file
  const migrationPath = path.join(__dirname, '..', '..', 'database', 'supabase', 'schema.sql');
  if (fs.existsSync(migrationPath)) {
    const sqlScript = fs.readFileSync(migrationPath, 'utf8');
    const statements = splitSqlScript(sqlScript);

    for (const statement of statements) {
      if (!statement.trim()) continue;
      try {
        await pgPool.query(statement);
      } catch (err) {
        if (!/already exists/i.test(err.message) && !/duplicate/i.test(err.message)) {
          console.warn('[schema] Statement warning:', err.message);
        }
      }
    }
  }

  // 2. Run ALTER TABLE migrations for new columns
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
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT',
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

  // 3. Ensure stories, story_views, time_capsules, anon_confessions tables exist
  const extraTables = [
    `CREATE TABLE IF NOT EXISTS stories (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      media_url TEXT NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'boomerang')),
      caption TEXT,
      duration_seconds INTEGER DEFAULT 15,
      views_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS story_views (
      id BIGSERIAL PRIMARY KEY,
      story_id BIGINT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      viewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      viewed_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (story_id, viewer_id)
    )`,
    `CREATE TABLE IF NOT EXISTS verification_requests (
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
    )`,
    `CREATE TABLE IF NOT EXISTS subscriptions (
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
    )`,
    `CREATE TABLE IF NOT EXISTS debates (
      id BIGSERIAL PRIMARY KEY,
      title TEXT,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      reveal_at TIMESTAMPTZ,
      created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS debate_participants (
      id BIGSERIAL PRIMARY KEY,
      debate_id BIGINT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      alias TEXT NOT NULL,
      is_revealed BOOLEAN DEFAULT FALSE,
      joined_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS time_capsules (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      message TEXT,
      media_url TEXT,
      unlock_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS anon_confessions (
      id BIGSERIAL PRIMARY KEY,
      body TEXT NOT NULL CHECK (char_length(body) BETWEEN 3 AND 2000),
      status TEXT DEFAULT 'visible' CHECK (status IN ('visible', 'review', 'removed')),
      likes_count INTEGER DEFAULT 0,
      reports_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    'CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id)',
    'CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON story_views(viewer_id)',
    'CREATE INDEX IF NOT EXISTS idx_time_capsules_user_unlock ON time_capsules(user_id, unlock_at)',
    'CREATE INDEX IF NOT EXISTS idx_anon_confessions_status_created ON anon_confessions(status, created_at DESC)',
    `CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('like','comment','follow','mention','gift','repost','story_view','group_invite','system')),
      message TEXT NOT NULL,
      post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
      comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
      group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS bookmarks (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, post_id)
    )`,
    `CREATE TABLE IF NOT EXISTS blocked_users (
      id BIGSERIAL PRIMARY KEY,
      blocker_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (blocker_id, blocked_id)
    )`,
    `CREATE TABLE IF NOT EXISTS novarix_coins (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      balance INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      total_spent INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE',
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id)',
  ];

  for (const stmt of extraTables) {
    try {
      await pgPool.query(stmt);
    } catch (err) {
      if (!/already exists/i.test(err.message)) {
        console.warn('[schema-extra] Warning:', err.message);
      }
    }
  }

  console.log('[PostgreSQL] Schema initialized successfully');
};

// ─── Database Initialization ─────────────────────────────────────────────────
const initDatabase = async () => {
  try {
    await pgPool.query('SELECT 1');
    console.log('[PostgreSQL] Connected to database via DATABASE_URL');
    await initializeSchema();
  } catch (err) {
    console.error('[PostgreSQL] Connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = { pool, initDatabase };
