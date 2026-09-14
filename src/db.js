'use strict';

/* =========================================================================
   Camada de dados — PostgreSQL
   -------------------------------------------------------------------------
   Em produção fala com o Supabase pelo "pg" (variável DATABASE_URL).
   Sem DATABASE_URL, sobe um Postgres embutido em WebAssembly (PGlite) dentro
   de data/pg — assim "npm install && npm run seed && npm start" funciona numa
   máquina nova, sem instalar banco nenhum.

   Todas as funções de consulta são assíncronas. O SQL continua escrito com
   "?" e com as funções de data do SQLite; a tradução para o dialeto do
   Postgres acontece num único lugar, em traduzir().
   ========================================================================= */

const path = require('node:path');
const fs = require('node:fs');

/*
 * Lê o .env quando existir. No Vercel as variáveis vêm da plataforma e o
 * arquivo não existe — daí o try/catch. Recurso nativo do Node, sem pacote.
 */
try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  /* sem .env: seguimos com o que estiver no ambiente */
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

/* ------------------------------------------------------------- conexão  */

let pool = null;          // driver escolhido
let pronto = null;        // promessa de inicialização (memoizada)

function conectar() {
  if (pool) return pool;

  const url = process.env.DATABASE_URL;

  if (url) {
    const { Pool } = require('pg');
    // Em ambiente serverless cada instância abre poucas conexões; o pooler do
    // Supabase (porta 6543) cuida do resto.
    const pg = new Pool({
      connectionString: url,
      max: Number(process.env.PGPOOL_MAX || 3),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
      ssl: /supabase|amazonaws|render|neon/.test(url) ? { rejectUnauthorized: false } : undefined,
    });
    pg.on('error', (e) => console.error('[pg] erro no pool:', e.message));
    pool = {
      tipo: 'pg',
      async query(sql, params) {
        const r = await pg.query(sql, params);
        return { rows: r.rows, rowCount: r.rowCount };
      },
      async exec(sql) {
        await pg.query(sql);
      },
      async end() {
        await pg.end();
      },
    };
    return pool;
  }

  // Desenvolvimento: Postgres em WebAssembly, gravado em disco.
  const { PGlite } = require('@electric-sql/pglite');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const lite = PGlite.create({ dataDir: path.join(DATA_DIR, 'pg') });
  pool = {
    tipo: 'pglite',
    async query(sql, params) {
      const db = await lite;
      const r = await db.query(sql, params);
      return { rows: r.rows || [], rowCount: r.affectedRows ?? (r.rows ? r.rows.length : 0) };
    },
    async exec(sql) {
      const db = await lite;
      await db.exec(sql);
    },
    async end() {
      const db = await lite;
      await db.close();
    },
  };
  return pool;
}

/* ------------------------------------------------------- tradução do SQL */

/* Tabelas sem coluna "id": nelas o INSERT não pode pedir RETURNING id. */
const SEM_ID = new Set(['post_tags', 'post_views', 'settings']);

const AGORA = "to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')";
const HOJE = "to_char(now() at time zone 'utc', 'YYYY-MM-DD')";

/**
 * Converte o SQL no dialeto usado pelo projeto para o do Postgres:
 * "?" vira $1, $2…, e as funções de data do SQLite viram to_char(now()).
 * Um "?" dentro de literal de texto quebraria isto — o projeto não usa
 * nenhum, e o teste em test/sql.test.js garante que continue assim.
 */
function traduzir(sql) {
  let n = 0;
  return sql
    // datetime('now', '-120 days') → agora menos o intervalo, no mesmo formato
    .replace(
      /\b(datetime|date)\(\s*'now'\s*,\s*'([+-]?\s*\d+)\s+(second|minute|hour|day|month|year)s?'\s*\)/gi,
      (_, fn, qtd, unidade) => {
        const sinal = qtd.trim().startsWith('-') ? '-' : '+';
        const valor = qtd.replace(/[^0-9]/g, '');
        const formato = fn.toLowerCase() === 'date' ? "'YYYY-MM-DD'" : "'YYYY-MM-DD HH24:MI:SS'";
        return `to_char(now() at time zone 'utc' ${sinal} interval '${valor} ${unidade}', ${formato})`;
      },
    )
    .replace(/\bdatetime\(\s*'now'\s*\)/gi, AGORA)
    .replace(/\bdate\(\s*'now'\s*\)/gi, HOJE)
    .replace(/\?/g, () => `$${++n}`);
}

/** Nome da tabela de um INSERT, para decidir sobre o RETURNING id. */
function tabelaDoInsert(sql) {
  const m = /^\s*insert\s+into\s+"?([a-z_][a-z0-9_]*)"?/i.exec(sql);
  return m ? m[1].toLowerCase() : null;
}

/* ------------------------------------------------------------- consultas */

const q = {
  async get(sql, ...params) {
    const r = await conectar().query(traduzir(sql), params);
    return r.rows[0];
  },

  async all(sql, ...params) {
    const r = await conectar().query(traduzir(sql), params);
    return r.rows;
  },

  /**
   * Devolve { rowCount, changes, lastInsertRowid }.
   * Em INSERTs numa tabela com "id", acrescenta RETURNING id para que
   * lastInsertRowid continue disponível como era no SQLite.
   */
  async run(sql, ...params) {
    let texto = traduzir(sql);
    const tabela = tabelaDoInsert(texto);
    const pedeId = tabela && !SEM_ID.has(tabela) && !/\breturning\b/i.test(texto);
    if (pedeId) texto += ' RETURNING id';

    const r = await conectar().query(texto, params);
    return {
      rowCount: r.rowCount,
      changes: r.rowCount,
      lastInsertRowid: pedeId && r.rows[0] ? r.rows[0].id : undefined,
    };
  },
};

/* --------------------------------------------------------------- esquema */

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  bio           TEXT DEFAULT '',
  avatar        TEXT DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT ${AGORA},
  last_login    TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT ${AGORA},
  expires_at TEXT NOT NULL,
  ip         TEXT,
  ua         TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  color       TEXT DEFAULT '#0f766e',
  position    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS people (
  id             INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS posts (
  id             INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
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
  person_id      INTEGER REFERENCES people(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'draft',
  featured       INTEGER NOT NULL DEFAULT 0,
  allow_comments INTEGER NOT NULL DEFAULT 1,
  published_at   TEXT,
  created_at     TEXT NOT NULL DEFAULT ${AGORA},
  updated_at     TEXT NOT NULL DEFAULT ${AGORA},
  views          INTEGER NOT NULL DEFAULT 0,
  reading_time   INTEGER NOT NULL DEFAULT 1,
  word_count     INTEGER NOT NULL DEFAULT 0,
  source_url     TEXT DEFAULT '',
  source_title   TEXT DEFAULT '',
  doi            TEXT DEFAULT '',
  seo_title      TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  search_tsv     tsvector
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id           INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
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
  created_at   TEXT NOT NULL DEFAULT ${AGORA}
);

CREATE TABLE IF NOT EXISTS media (
  id         INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  filename   TEXT NOT NULL,
  original   TEXT NOT NULL,
  mime       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  alt        TEXT DEFAULT '',
  credit     TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ${AGORA}
);

CREATE TABLE IF NOT EXISTS post_images (
  id       INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
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
  id         INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT DEFAULT '',
  body       TEXT NOT NULL,
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT ${AGORA}
);

CREATE TABLE IF NOT EXISTS subscribers (
  id         INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT DEFAULT '',
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT ${AGORA}
);

CREATE TABLE IF NOT EXISTS publications (
  id        INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
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
  position  INTEGER DEFAULT 0,
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS research_lines (
  id        INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title     TEXT NOT NULL,
  summary   TEXT DEFAULT '',
  keywords  TEXT DEFAULT '',
  icon      TEXT DEFAULT '',
  position  INTEGER DEFAULT 0,
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title       TEXT NOT NULL,
  period      TEXT DEFAULT '',
  role        TEXT DEFAULT '',
  funder      TEXT DEFAULT '',
  status      TEXT DEFAULT '',
  kind        TEXT DEFAULT 'pesquisa',
  description TEXT DEFAULT '',
  position    INTEGER DEFAULT 0,
  person_id   INTEGER REFERENCES people(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS timeline (
  id          INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  period      TEXT NOT NULL,
  sort_year   INTEGER NOT NULL DEFAULT 0,
  title       TEXT NOT NULL,
  org         TEXT DEFAULT '',
  description TEXT DEFAULT '',
  kind        TEXT DEFAULT 'carreira',
  person_id   INTEGER REFERENCES people(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS awards (
  id        INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  year      INTEGER NOT NULL,
  title     TEXT NOT NULL,
  org       TEXT DEFAULT '',
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teaching (
  id        INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  period    TEXT NOT NULL,
  course    TEXT NOT NULL,
  level     TEXT DEFAULT '',
  subjects  TEXT DEFAULT '',
  org       TEXT DEFAULT 'UFAM',
  position  INTEGER DEFAULT 0,
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mentorships (
  id          INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  year        INTEGER NOT NULL DEFAULT 0,
  student     TEXT NOT NULL,
  title       TEXT DEFAULT '',
  kind        TEXT NOT NULL DEFAULT 'mestrado',
  role        TEXT DEFAULT 'Orientadora',
  status      TEXT DEFAULT 'concluída',
  institution TEXT DEFAULT 'Universidade Federal do Amazonas',
  funding     TEXT DEFAULT '',
  person_id   INTEGER REFERENCES people(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS post_views (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  day     TEXT NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, day)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id         INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id    INTEGER,
  action     TEXT NOT NULL,
  detail     TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ${AGORA}
);

CREATE INDEX IF NOT EXISTS idx_posts_status   ON posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post  ON comments(post_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_busca    ON posts USING gin(search_tsv);
`;

/** Cria o esquema. Roda uma vez por processo; seguro chamar de novo. */
function init() {
  if (!pronto) {
    pronto = (async () => {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      await conectar().exec(ESQUEMA);
    })().catch((e) => {
      pronto = null; // permite nova tentativa numa próxima requisição
      throw e;
    });
  }
  return pronto;
}

/* ----------------------------------------------------------- busca textual

   No SQLite a busca era uma tabela virtual FTS5. No Postgres é uma coluna
   tsvector em posts, com índice GIN e o dicionário de português — que cuida
   dos radicais ("antivenenos" encontra "antiveneno") e dos acentos.        */

const CONFIG_BUSCA = "'portuguese'";

async function reindexPost(postId) {
  const post = await q.get('SELECT * FROM posts WHERE id = ?', postId);
  if (!post || post.status !== 'published') {
    await q.run('UPDATE posts SET search_tsv = NULL WHERE id = ?', postId);
    return;
  }
  const tags = (
    await q.all(
      'SELECT t.name FROM tags t JOIN post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ?',
      postId,
    )
  )
    .map((t) => t.name)
    .join(' ');

  // Pesos: A = título, B = resumo e tags, C = corpo.
  await q.run(
    `UPDATE posts SET search_tsv =
        setweight(to_tsvector(${CONFIG_BUSCA}, coalesce(?, '')), 'A') ||
        setweight(to_tsvector(${CONFIG_BUSCA}, coalesce(?, '')), 'B') ||
        setweight(to_tsvector(${CONFIG_BUSCA}, coalesce(?, '')), 'B') ||
        setweight(to_tsvector(${CONFIG_BUSCA}, coalesce(?, '')), 'C')
     WHERE id = ?`,
    post.title || '',
    post.excerpt || '',
    tags,
    (post.body_md || '').replace(/[#*_`>[\]()]/g, ' '),
    postId,
  );
}

async function rebuildIndex() {
  const posts = await q.all("SELECT id FROM posts WHERE status = 'published'");
  for (const p of posts) await reindexPost(p.id);
}

/** Ids dos posts que casam com o termo, dos mais relevantes aos menos. */
async function searchPosts(termo, limite = 200) {
  const texto = String(termo || '').trim();
  if (!texto) return [];
  const rows = await q.all(
    `SELECT id FROM posts
      WHERE search_tsv @@ websearch_to_tsquery(${CONFIG_BUSCA}, ?)
      ORDER BY ts_rank(search_tsv, websearch_to_tsquery(${CONFIG_BUSCA}, ?)) DESC
      LIMIT ${Number(limite) || 200}`,
    texto,
    texto,
  );
  return rows.map((r) => r.id);
}

/* --------------------------------------------------------------- settings */

const DEFAULT_SETTINGS = {
  site_title: 'Ciência: Mitos, Curiosidades e Conceitos',
  site_tagline: 'Maria Cristina dos Santos Sobreira de Sampaio e Sonia Bonduki',
  site_description:
    'Ciência: Mitos, Curiosidades e Conceitos é um projeto de divulgação científica de '
    + 'Maria Cristina dos Santos Sobreira de Sampaio e Sonia Bonduki, duas biólogas. '
    + 'Imunologia, animais peçonhentos, Amazônia e ensino de Ciências.',
  owner_name: 'Maria Cristina dos Santos Sobreira de Sampaio e Sonia Bonduki',
  owner_short: 'Maria Cristina dos Santos Sobreira de Sampaio e Sonia Bonduki',
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

/*
 * getSettings() é chamado em toda requisição. Guardamos o resultado por um
 * curto período para não gastar uma ida ao banco por página; setSetting()
 * derruba o cache na hora.
 */
let cacheSettings = null;
let cacheAte = 0;
const CACHE_MS = Number(process.env.SETTINGS_CACHE_MS || 15_000);

async function getSettings() {
  if (cacheSettings && Date.now() < cacheAte) return cacheSettings;
  const rows = await q.all('SELECT key, value FROM settings');
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  cacheSettings = out;
  cacheAte = Date.now() + CACHE_MS;
  return out;
}

function invalidarSettings() {
  cacheSettings = null;
  cacheAte = 0;
}

async function setSetting(key, value) {
  await q.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    key,
    String(value ?? ''),
  );
  invalidarSettings();
}

async function log(userId, action, detail = '') {
  await q.run(
    'INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)',
    userId ?? null,
    action,
    detail,
  );
}

/** Fecha a conexão — usado pelos scripts de linha de comando. */
async function encerrar() {
  if (pool) {
    await pool.end();
    pool = null;
    pronto = null;
  }
}

module.exports = {
  q,
  init,
  encerrar,
  conectar,
  traduzir,
  reindexPost,
  rebuildIndex,
  searchPosts,
  getSettings,
  setSetting,
  invalidarSettings,
  log,
  DEFAULT_SETTINGS,
  UPLOAD_DIR,
  DATA_DIR,
};
