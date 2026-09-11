'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'site.db'));

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  bio           TEXT DEFAULT '',
  avatar        TEXT DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login    TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  ip         TEXT,
  ua         TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  color       TEXT DEFAULT '#0f766e',
  position    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  subtitle       TEXT DEFAULT '',
  excerpt        TEXT DEFAULT '',
  body_md        TEXT DEFAULT '',
  body_html      TEXT DEFAULT '',
  cover          TEXT DEFAULT '',
  cover_credit   TEXT DEFAULT '',
  category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  author_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'draft',
  featured       INTEGER NOT NULL DEFAULT 0,
  allow_comments INTEGER NOT NULL DEFAULT 1,
  published_at   TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  views          INTEGER NOT NULL DEFAULT 0,
  reading_time   INTEGER NOT NULL DEFAULT 1,
  word_count     INTEGER NOT NULL DEFAULT 0,
  source_url     TEXT DEFAULT '',
  source_title   TEXT DEFAULT '',
  doi            TEXT DEFAULT '',
  seo_title      TEXT DEFAULT '',
  seo_description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id      INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id    INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  author_name  TEXT NOT NULL,
  author_email TEXT DEFAULT '',
  author_site  TEXT DEFAULT '',
  body         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  spam_score   INTEGER NOT NULL DEFAULT 0,
  spam_reason  TEXT DEFAULT '',
  by_owner     INTEGER NOT NULL DEFAULT 0,
  ip           TEXT,
  ua           TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  filename   TEXT NOT NULL,
  original   TEXT NOT NULL,
  mime       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  alt        TEXT DEFAULT '',
  credit     TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS people (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  short_name     TEXT NOT NULL,
  role           TEXT DEFAULT '',
  tagline        TEXT DEFAULT '',
  bio            TEXT DEFAULT '',
  portrait       TEXT DEFAULT '',
  initials       TEXT DEFAULT '',
  accent         TEXT DEFAULT '#14532d',
  lattes_id      TEXT DEFAULT '',
  lattes_url     TEXT DEFAULT '',
  lattes_updated TEXT DEFAULT '',
  orcid_url      TEXT DEFAULT '',
  citation_names TEXT DEFAULT '',
  languages      TEXT DEFAULT '[]',
  areas          TEXT DEFAULT '[]',
  nationality    TEXT DEFAULT 'Brasil',
  email          TEXT DEFAULT '',
  position       INTEGER NOT NULL DEFAULT 0,
  active         INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS post_images (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id  INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  url      TEXT NOT NULL,
  caption  TEXT DEFAULT '',
  credit   TEXT DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT DEFAULT '',
  body       TEXT NOT NULL,
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscribers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT DEFAULT '',
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS publications (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  year      INTEGER NOT NULL,
  authors   TEXT NOT NULL,
  title     TEXT NOT NULL,
  venue     TEXT DEFAULT '',
  details   TEXT DEFAULT '',
  doi       TEXT DEFAULT '',
  url       TEXT DEFAULT '',
  citations INTEGER DEFAULT 0,
  kind      TEXT DEFAULT 'artigo',
  highlight INTEGER DEFAULT 0,
  position  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS research_lines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  summary     TEXT DEFAULT '',
  keywords    TEXT DEFAULT '',
  icon        TEXT DEFAULT '',
  position    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  period      TEXT DEFAULT '',
  role        TEXT DEFAULT '',
  funder      TEXT DEFAULT '',
  status      TEXT DEFAULT '',
  kind        TEXT DEFAULT 'pesquisa',
  description TEXT DEFAULT '',
  position    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS timeline (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  period      TEXT NOT NULL,
  sort_year   INTEGER NOT NULL DEFAULT 0,
  title       TEXT NOT NULL,
  org         TEXT DEFAULT '',
  description TEXT DEFAULT '',
  kind        TEXT DEFAULT 'carreira'
);

CREATE TABLE IF NOT EXISTS awards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  year        INTEGER NOT NULL,
  title       TEXT NOT NULL,
  org         TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS teaching (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  period   TEXT NOT NULL,
  course   TEXT NOT NULL,
  level    TEXT DEFAULT '',
  subjects TEXT DEFAULT '',
  org      TEXT DEFAULT 'UFAM',
  position INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mentorships (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  year        INTEGER NOT NULL DEFAULT 0,
  student     TEXT NOT NULL,
  title       TEXT DEFAULT '',
  kind        TEXT NOT NULL DEFAULT 'mestrado',
  role        TEXT DEFAULT 'Orientadora',
  status      TEXT DEFAULT 'concluída',
  institution TEXT DEFAULT 'Universidade Federal do Amazonas',
  funding     TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS post_views (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  day     TEXT NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, day)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  action     TEXT NOT NULL,
  detail     TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status, created_at DESC);

`);

/* --------------------------------------------------- migrações simples  */

/* Colunas acrescentadas depois da primeira versão do banco. */
{
  const has = (table, col) =>
    db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
  if (!has('media', 'credit')) db.exec("ALTER TABLE media ADD COLUMN credit TEXT DEFAULT ''");

  // autoria: cada registro do currículo e cada post pertence a uma pessoa
  for (const t of [
    'publications', 'projects', 'timeline', 'teaching',
    'mentorships', 'research_lines', 'awards', 'posts',
  ]) {
    if (!has(t, 'person_id')) db.exec(`ALTER TABLE ${t} ADD COLUMN person_id INTEGER`);
  }
}

/* ---------------------------------------------------------- índice FTS  */

/*
 * A busca usa FTS5. A tabela precisa guardar o próprio conteúdo: no modo
 * "contentless" (content='') o SQLite recusa DELETE, e reindexar um post
 * já existente quebraria. Versões antigas do banco são migradas aqui.
 */
{
  const existing = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'posts_fts'")
    .get();
  if (existing && /content\s*=\s*''/.test(existing.sql)) {
    db.exec('DROP TABLE posts_fts');
  }
  db.exec('CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(title, excerpt, body, tags);');
}

/* ---------------------------------------------------------------- helpers */

const q = {
  get(sql, ...params) {
    return db.prepare(sql).get(...params);
  },
  all(sql, ...params) {
    return db.prepare(sql).all(...params);
  },
  run(sql, ...params) {
    return db.prepare(sql).run(...params);
  },
};

/** Reindexa um post na tabela FTS. */
function reindexPost(postId) {
  const post = q.get('SELECT * FROM posts WHERE id = ?', postId);
  q.run('DELETE FROM posts_fts WHERE rowid = ?', postId);
  if (!post || post.status !== 'published') return;
  const tags = q
    .all(
      'SELECT t.name FROM tags t JOIN post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ?',
      postId,
    )
    .map((t) => t.name)
    .join(' ');
  q.run(
    'INSERT INTO posts_fts (rowid, title, excerpt, body, tags) VALUES (?, ?, ?, ?, ?)',
    postId,
    post.title || '',
    post.excerpt || '',
    (post.body_md || '').replace(/[#*_`>\[\]()]/g, ' '),
    tags,
  );
}

function rebuildIndex() {
  q.run('DELETE FROM posts_fts');
  for (const p of q.all("SELECT id FROM posts WHERE status = 'published'")) {
    reindexPost(p.id);
  }
}

/* --------------------------------------------------------------- settings */

const DEFAULT_SETTINGS = {
  site_title: 'Maria Cristina dos Santos Sobreira de Sampaio',
  site_tagline: 'Imunologia, animais peçonhentos e ciência da Amazônia',
  site_description:
    'Blog e site pessoal da Profa. Dra. Maria Cristina dos Santos Sobreira de Sampaio — imunologista, professora titular aposentada da UFAM e pesquisadora de venenos, antivenenos e Imunologia Comparada.',
  owner_name: 'Maria Cristina dos Santos Sobreira de Sampaio',
  owner_short: 'Maria Cristina dos Santos Sobreira de Sampaio',
  owner_role: 'Professora Titular (aposentada) — Instituto de Ciências Biológicas / UFAM',
  contact_email: '',
  lattes_url: 'http://lattes.cnpq.br/4923902785529755',
  orcid_url: 'https://orcid.org/0000-0002-1504-2647',
  scientia_url: 'https://scientia-amazonia.org',
  instagram_url: '',
  linkedin_url: '',
  comment_policy: 'moderate', // moderate | auto | closed
  posts_per_page: '9',
  hero_image: '',
  portrait_image: '',
  ai_enabled: '1',
  analytics_enabled: '1',
};

function getSettings() {
  const rows = q.all('SELECT key, value FROM settings');
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

function setSetting(key, value) {
  q.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    String(value ?? ''),
  );
}

function log(userId, action, detail = '') {
  q.run(
    'INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)',
    userId ?? null,
    action,
    detail,
  );
}

module.exports = {
  db,
  q,
  reindexPost,
  rebuildIndex,
  getSettings,
  setSetting,
  DEFAULT_SETTINGS,
  log,
  DATA_DIR,
  UPLOAD_DIR,
};
