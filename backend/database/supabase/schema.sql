CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'creator', 'admin', 'moderator', 'elite')),
  email_confirmed BOOLEAN DEFAULT FALSE,
  phone_confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token TEXT,
  phone_verification_code TEXT,
  reset_token TEXT,
  reset_expires TIMESTAMPTZ,
  privacy_posts TEXT DEFAULT 'public' CHECK (privacy_posts IN ('public', 'close_friends', 'private')),
  is_bot_banned BOOLEAN DEFAULT FALSE,
  bot_ban_reason TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  likes_received_count INTEGER DEFAULT 0,
  is_creator_eligible BOOLEAN DEFAULT FALSE,
  verified_badge TEXT CHECK (verified_badge IN ('sun', 'moon', 'star')),
  is_verified BOOLEAN DEFAULT FALSE,
  app_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption TEXT,
  media_url TEXT NOT NULL,
  media_urls TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  duration INTEGER,
  width INTEGER,
  height INTEGER,
  fps INTEGER,
  privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'close_friends', 'private')),
  unlock_at TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  watermark_applied BOOLEAN DEFAULT FALSE,
  has_reaction BOOLEAN DEFAULT FALSE,
  reaction_post_id BIGINT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  is_nearby BOOLEAN DEFAULT FALSE,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_reposts (
  id BIGSERIAL PRIMARY KEY,
  original_post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  repost_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (original_post_id, repost_by_user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  text TEXT,
  voice_url TEXT,
  image_url TEXT,
  sticker_id TEXT,
  document_url TEXT,
  document_name TEXT,
  document_size BIGINT,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  poll_id BIGINT,
  voice_duration INTEGER,
  gift_sticker_id TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reactions (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry', 'duet', 'react_video')),
  reaction_media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS gifts (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_usd NUMERIC(10,2) NOT NULL,
  admin_fee_usd NUMERIC(10,2) DEFAULT 0,
  tax_usd NUMERIC(10,2) DEFAULT 0,
  creator_receive_usd NUMERIC(10,2) DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_transactions (
  id BIGSERIAL PRIMARY KEY,
  gift_id BIGINT NOT NULL REFERENCES gifts(id),
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  comment_id BIGINT,
  amount_usd NUMERIC(10,2) NOT NULL,
  admin_fee_usd NUMERIC(10,2) NOT NULL,
  tax_usd NUMERIC(10,2) NOT NULL,
  creator_receive_usd NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stickers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  pack_name TEXT,
  image_url TEXT,
  is_gift BOOLEAN DEFAULT FALSE,
  price_usd NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_stickers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sticker_id BIGINT NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, sticker_id)
);

CREATE TABLE IF NOT EXISTS follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_close_friend BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS close_friends (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT FALSE,
  invite_code TEXT UNIQUE,
  max_members INTEGER DEFAULT 35000000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_polls (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  creator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_poll_votes (
  id BIGSERIAL PRIMARY KEY,
  poll_id BIGINT NOT NULL REFERENCES group_polls(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
  text TEXT,
  voice_url TEXT,
  image_url TEXT,
  video_url TEXT,
  sticker_id TEXT,
  document_url TEXT,
  document_name TEXT,
  document_size BIGINT,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  poll_id BIGINT REFERENCES group_polls(id) ON DELETE CASCADE,
  voice_duration INTEGER,
  reply_to_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls (
  id BIGSERIAL PRIMARY KEY,
  caller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('voice', 'video', 'screen')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ringing', 'accepted', 'rejected', 'ended', 'missed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  screen_recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ads (
  id BIGSERIAL PRIMARY KEY,
  creator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT,
  target_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'scheduled', 'active', 'completed')),
  fee_usd NUMERIC(10,2) DEFAULT 1000,
  impressions_target INTEGER DEFAULT 1000000,
  impressions_delivered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  target_post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  target_group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
  target_message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  evidence_urls TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  moderator_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_capsules (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  media_url TEXT,
  unlock_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anon_confessions (
  id BIGSERIAL PRIMARY KEY,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 3 AND 2000),
  status TEXT DEFAULT 'visible' CHECK (status IN ('visible', 'review', 'removed')),
  likes_count INTEGER DEFAULT 0,
  reports_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_checks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checks_run INTEGER DEFAULT 0,
  last_check_at TIMESTAMPTZ,
  is_flagged_bot BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  auto_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS terms_acceptances (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watermarks (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  watermark_type TEXT DEFAULT 'permanent' CHECK (watermark_type IN ('temporary', 'permanent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comment_likes (
  id BIGSERIAL PRIMARY KEY,
  comment_id BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stories & Boomerang tables
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
);

CREATE TABLE IF NOT EXISTS story_views (
  id BIGSERIAL PRIMARY KEY,
  story_id BIGINT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_gifts_active ON gifts(is_active);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_receiver ON gift_transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_ads_creator ON ads(creator_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_bot_checks_user ON bot_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_time_capsules_user_unlock ON time_capsules(user_id, unlock_at);
CREATE INDEX IF NOT EXISTS idx_anon_confessions_status_created ON anon_confessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON story_views(viewer_id);
