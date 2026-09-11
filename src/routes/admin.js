'use strict';

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');

const { q, db, reindexPost, getSettings, setSetting, log, UPLOAD_DIR } = require('../db');
const auth = require('../auth');
const intel = require('../intel');
const ai = require('../ai');
const { renderMarkdown, renderComment } = require('../markdown');
const { formatDate } = require('./public');

const router = express.Router();

/* ---------------------------------------------------------------- setup */

router.use((req, res, next) => {
  res.locals.layoutAdmin = true;
  res.locals.csrf = auth.csrfToken(req, res);
  res.locals.aiEnabled = ai.enabled();
  res.locals.fmt = formatDate;
  res.locals.pessoas = q.all('SELECT * FROM people ORDER BY position, id');
  next();
});

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 8) || '.bin';
      const base = intel.slugify(path.basename(file.originalname, ext)).slice(0, 40) || 'arquivo';
      cb(null, `${Date.now().toString(36)}-${base}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = /^image\/(jpeg|png|gif|webp|avif|svg\+xml)$/.test(file.mimetype);
    cb(ok ? null : new Error('Apenas imagens são aceitas.'), ok);
  },
});

/* ---------------------------------------------------------------- login */

router.get('/entrar', (req, res) => {
  if (req.user) return res.redirect('/admin');
  res.render('admin/login', {
    title: 'Entrar',
    erro: req.query.erro || null,
    next: req.query.next || '/admin',
  });
});

router.post('/entrar', auth.checkCsrf, (req, res) => {
  const ip = req.ip || '';
  const destino = String(req.body.next || '/admin');
  const back = (msg) =>
    res.redirect(`/admin/entrar?erro=${encodeURIComponent(msg)}&next=${encodeURIComponent(destino)}`);

  if (auth.tooManyAttempts(ip)) {
    return back('Muitas tentativas. Aguarde 10 minutos.');
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const user = q.get('SELECT * FROM users WHERE lower(email) = ?', email);

  if (!user || !auth.verifyPassword(senha, user.password_hash)) {
    auth.registerFailure(ip);
    return back('E-mail ou senha incorretos.');
  }

  auth.clearFailures(ip);
  const session = auth.createSession(user.id, req);
  res.cookie(auth.SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    expires: session.expires,
    secure: req.protocol === 'https',
  });
  log(user.id, 'login', ip);
  res.redirect(destino.startsWith('/admin') ? destino : '/admin');
});

router.post('/sair', auth.checkCsrf, (req, res) => {
  auth.destroySession(req.cookies?.[auth.SESSION_COOKIE]);
  res.clearCookie(auth.SESSION_COOKIE);
  res.redirect('/admin/entrar');
});

/* ------------------------------------------------ tudo abaixo exige login */

router.use(auth.requireAuth);
router.use(auth.checkCsrf);

/* ------------------------------------------------------------ dashboard */

router.get('/', (req, res) => {
  const counts = {
    published: q.get("SELECT COUNT(*) AS n FROM posts WHERE status = 'published'").n,
    drafts: q.get("SELECT COUNT(*) AS n FROM posts WHERE status = 'draft'").n,
    scheduled: q.get("SELECT COUNT(*) AS n FROM posts WHERE status = 'scheduled'").n,
    pending: q.get("SELECT COUNT(*) AS n FROM comments WHERE status = 'pending'").n,
    spam: q.get("SELECT COUNT(*) AS n FROM comments WHERE status = 'spam'").n,
    messages: q.get('SELECT COUNT(*) AS n FROM messages WHERE read_at IS NULL').n,
    subscribers: q.get('SELECT COUNT(*) AS n FROM subscribers WHERE active = 1').n,
    views: q.get('SELECT COALESCE(SUM(views),0) AS n FROM posts').n,
  };

  const recentPosts = q.all(
    `SELECT p.*, c.name AS category_name FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.updated_at DESC LIMIT 6`,
  );

  const pendingComments = q.all(
    `SELECT co.*, p.title AS post_title, p.slug AS post_slug FROM comments co
       JOIN posts p ON p.id = co.post_id
      WHERE co.status = 'pending' ORDER BY co.created_at DESC LIMIT 5`,
  ).map((c) => ({ ...c, html: renderComment(c.body) }));

  const topPosts = q.all(
    `SELECT title, slug, views FROM posts WHERE status = 'published'
      ORDER BY views DESC LIMIT 5`,
  );

  // série de visualizações dos últimos 14 dias
  const series = q.all(
    `SELECT day, SUM(count) AS n FROM post_views
      WHERE day >= date('now','-13 days') GROUP BY day ORDER BY day`,
  );
  const days = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    days.push({ day: d, n: series.find((s) => s.day === d)?.n || 0 });
  }

  const ideas = intel.suggestTopics({
    tags: q.all(
      `SELECT t.name, COUNT(*) AS n FROM tags t JOIN post_tags pt ON pt.tag_id = t.id
        GROUP BY t.id ORDER BY n DESC LIMIT 6`,
    ),
    categories: q.all(
      `SELECT c.name, c.slug,
              EXISTS(SELECT 1 FROM posts p WHERE p.category_id = c.id
                       AND p.status='published' AND p.published_at > datetime('now','-120 days')) AS recent
         FROM categories c ORDER BY c.position`,
    ),
    recentTitles: recentPosts.map((p) => p.title),
  });

  res.render('admin/dashboard', {
    title: 'Painel',
    counts,
    recentPosts,
    pendingComments,
    topPosts,
    days,
    ideas,
  });
});

/* --------------------------------------------------------------- posts  */

router.get('/posts', (req, res) => {
  const status = req.query.status || '';
  const termo = (req.query.q || '').trim();
  let sql = `SELECT p.*, c.name AS category_name FROM posts p
               LEFT JOIN categories c ON c.id = p.category_id WHERE 1=1`;
  const params = [];
  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }
  if (termo) {
    sql += ' AND (p.title LIKE ? OR p.body_md LIKE ?)';
    params.push(`%${termo}%`, `%${termo}%`);
  }
  sql += ' ORDER BY p.updated_at DESC LIMIT 100';

  res.render('admin/posts', {
    title: 'Posts',
    posts: q.all(sql, ...params),
    status,
    termo,
    counts: {
      all: q.get('SELECT COUNT(*) AS n FROM posts').n,
      published: q.get("SELECT COUNT(*) AS n FROM posts WHERE status='published'").n,
      draft: q.get("SELECT COUNT(*) AS n FROM posts WHERE status='draft'").n,
      scheduled: q.get("SELECT COUNT(*) AS n FROM posts WHERE status='scheduled'").n,
    },
  });
});

function editorData(post) {
  const tags = post
    ? q
        .all(
          'SELECT t.name FROM tags t JOIN post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ?',
          post.id,
        )
        .map((t) => t.name)
    : [];
  return {
    post,
    tagList: tags.join(', '),
    audit: post
      ? intel.auditPost({
          ...post,
          tagCount: tags.length,
          galleryCount: q.get(
            'SELECT COUNT(*) AS n FROM post_images WHERE post_id = ?',
            post.id,
          ).n,
        })
      : null,
    media: q.all('SELECT * FROM media ORDER BY created_at DESC LIMIT 60'),
    allTags: q.all('SELECT name FROM tags ORDER BY name').map((t) => t.name),
    gallery: post
      ? q.all('SELECT * FROM post_images WHERE post_id = ? ORDER BY position, id', post.id)
      : [],
  };
}

/** Regrava a galeria do post a partir dos campos enviados pelo formulário. */
function syncGallery(postId, body) {
  const urls = [].concat(body['gallery_url[]'] || body.gallery_url || []);
  const captions = [].concat(body['gallery_caption[]'] || body.gallery_caption || []);
  const credits = [].concat(body['gallery_credit[]'] || body.gallery_credit || []);

  q.run('DELETE FROM post_images WHERE post_id = ?', postId);
  let position = 0;
  for (let i = 0; i < urls.length; i += 1) {
    const url = String(urls[i] || '').trim();
    if (!url) continue;
    q.run(
      'INSERT INTO post_images (post_id, url, caption, credit, position) VALUES (?,?,?,?,?)',
      postId,
      url,
      String(captions[i] || '').trim().slice(0, 400),
      String(credits[i] || '').trim().slice(0, 200),
      position,
    );
    position += 1;
  }
  return position;
}

router.get('/posts/novo', (req, res) => {
  res.render('admin/post-edit', {
    title: 'Novo post',
    ...editorData(null),
  });
});

router.get('/posts/:id', (req, res, next) => {
  const post = q.get('SELECT * FROM posts WHERE id = ?', req.params.id);
  if (!post) return next();
  res.render('admin/post-edit', { title: 'Editar post', ...editorData(post) });
});

function syncTags(postId, raw) {
  q.run('DELETE FROM post_tags WHERE post_id = ?', postId);
  const names = String(raw || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
  for (const name of names) {
    const slug = intel.slugify(name);
    if (!slug) continue;
    q.run('INSERT OR IGNORE INTO tags (slug, name) VALUES (?, ?)', slug, name);
    const tag = q.get('SELECT id FROM tags WHERE slug = ?', slug);
    q.run('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)', postId, tag.id);
  }
}

function uniqueSlug(base, excludeId = 0) {
  let slug = intel.slugify(base) || `post-${Date.now().toString(36)}`;
  let n = 1;
  while (q.get('SELECT id FROM posts WHERE slug = ? AND id != ?', slug, excludeId)) {
    n += 1;
    slug = `${intel.slugify(base)}-${n}`;
  }
  return slug;
}

router.post('/posts/salvar', (req, res) => {
  const b = req.body;
  const id = parseInt(b.id, 10) || 0;
  const title = String(b.title || '').trim() || 'Sem título';
  const body_md = String(b.body_md || '');
  const stats = intel.readingStats(body_md);
  const slug = uniqueSlug(b.slug || title, id);

  let status = ['draft', 'published', 'scheduled'].includes(b.status) ? b.status : 'draft';
  let publishedAt = b.published_at ? String(b.published_at).replace('T', ' ') + ':00' : null;

  if (status === 'published' && !publishedAt) {
    publishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
  if (status === 'scheduled') {
    if (!publishedAt) status = 'draft';
    else if (new Date(publishedAt.replace(' ', 'T')) <= new Date()) status = 'published';
  }

  const fields = {
    slug,
    title,
    subtitle: String(b.subtitle || '').trim(),
    excerpt: String(b.excerpt || '').trim() || intel.summarize(body_md, 240),
    body_md,
    body_html: renderMarkdown(body_md),
    cover: String(b.cover || '').trim(),
    cover_credit: String(b.cover_credit || '').trim(),
    category_id: parseInt(b.category_id, 10) || null,
    status,
    featured: b.featured ? 1 : 0,
    allow_comments: b.allow_comments ? 1 : 0,
    published_at: publishedAt,
    reading_time: stats.readingTime,
    word_count: stats.wordCount,
    source_url: String(b.source_url || '').trim(),
    source_title: String(b.source_title || '').trim(),
    doi: String(b.doi || '').trim(),
    person_id: parseInt(b.person_id, 10) || null,
    seo_title: String(b.seo_title || '').trim(),
    seo_description: String(b.seo_description || '').trim(),
  };

  let postId = id;
  if (id) {
    const cols = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
    q.run(
      `UPDATE posts SET ${cols}, updated_at = datetime('now') WHERE id = ?`,
      ...Object.values(fields),
      id,
    );
  } else {
    const cols = Object.keys(fields).join(', ');
    const marks = Object.keys(fields).map(() => '?').join(', ');
    const info = q.run(
      `INSERT INTO posts (${cols}, author_id) VALUES (${marks}, ?)`,
      ...Object.values(fields),
      req.user.id,
    );
    postId = Number(info.lastInsertRowid);
  }

  syncTags(postId, b.tags);
  syncGallery(postId, b);
  reindexPost(postId);
  log(req.user.id, id ? 'post.update' : 'post.create', title);

  const msg = status === 'published' ? 'Post publicado.' : 'Alterações salvas.';
  res.redirect(`/admin/posts/${postId}?ok=${encodeURIComponent(msg)}`);
});

router.post('/posts/:id/excluir', (req, res) => {
  const post = q.get('SELECT title FROM posts WHERE id = ?', req.params.id);
  q.run('DELETE FROM posts WHERE id = ?', req.params.id);
  q.run('DELETE FROM posts_fts WHERE rowid = ?', req.params.id);
  log(req.user.id, 'post.delete', post?.title || req.params.id);
  res.redirect(`/admin/posts?ok=${encodeURIComponent('Post excluído.')}`);
});

router.post('/posts/:id/duplicar', (req, res) => {
  const p = q.get('SELECT * FROM posts WHERE id = ?', req.params.id);
  if (!p) return res.redirect('/admin/posts');
  const info = q.run(
    `INSERT INTO posts (slug, title, subtitle, excerpt, body_md, body_html, cover,
       category_id, author_id, status, allow_comments)
     VALUES (?,?,?,?,?,?,?,?,?,'draft',1)`,
    uniqueSlug(`${p.title}-copia`),
    `${p.title} (cópia)`,
    p.subtitle,
    p.excerpt,
    p.body_md,
    p.body_html,
    p.cover,
    p.category_id,
    req.user.id,
  );
  res.redirect(`/admin/posts/${Number(info.lastInsertRowid)}?ok=Cópia criada como rascunho.`);
});

/* ------------------------------------------------- API do editor (fetch) */

/** Análise instantânea: resumo, tags, categoria, SEO, legibilidade. */
router.post('/api/analisar', (req, res) => {
  const { title = '', body = '', tags = '', cover = '', category_id = '' } = req.body;
  const categories = q.all('SELECT * FROM categories ORDER BY position');
  const tagCount = String(tags).split(',').filter((t) => t.trim()).length;

  res.json({
    html: renderMarkdown(body),
    stats: intel.readingStats(body),
    excerpt: intel.summarize(body, 240),
    seo_description: intel.summarize(body, 150),
    tags: intel.suggestTags(`${title}\n${body}`, 6),
    category: intel.suggestCategory(`${title}\n${body}`, categories),
    slug: intel.slugify(title),
    audit: intel.auditPost({
      title,
      subtitle: req.body.subtitle,
      body_md: body,
      excerpt: req.body.excerpt,
      cover,
      category_id: parseInt(category_id, 10) || null,
      tagCount,
      galleryCount: parseInt(req.body.galleryCount, 10) || 0,
      source_url: req.body.source_url,
      source_title: req.body.source_title,
    }),
  });
});

/** Ações do assistente de IA (opcional). */
router.post('/api/ia/:acao', async (req, res) => {
  if (!ai.enabled()) {
    return res.status(400).json({ erro: 'Assistente de IA não configurado.' });
  }
  const { acao } = req.params;
  try {
    if (acao === 'metadados') {
      const out = await ai.metadata({ title: req.body.title, body: req.body.body });
      if (!out) return res.status(502).json({ erro: 'Não consegui analisar agora.' });
      return res.json(out);
    }
    if (acao === 'reescrever') {
      const modo = req.body.modo || 'revisar';
      const out = await ai.rewrite(req.body.body, modo);
      if (!out) return res.status(502).json({ erro: 'Não consegui reescrever agora.' });
      return res.json({ texto: out });
    }
    if (acao === 'rascunho') {
      const out = await ai.draftFromSource(req.body);
      if (!out) return res.status(502).json({ erro: 'Não consegui gerar o rascunho.' });
      return res.json({ texto: out });
    }
    return res.status(404).json({ erro: 'Ação desconhecida.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro no assistente.' });
  }
});

/* ---------------------------------------------------------- comentários */

router.get('/comentarios', (req, res) => {
  const status = req.query.status || 'pending';
  const rows = q
    .all(
      `SELECT co.*, p.title AS post_title, p.slug AS post_slug FROM comments co
         JOIN posts p ON p.id = co.post_id
        WHERE co.status = ? ORDER BY co.created_at DESC LIMIT 200`,
      status,
    )
    .map((c) => ({ ...c, html: renderComment(c.body) }));

  res.render('admin/comentarios', {
    title: 'Comentários',
    comments: rows,
    status,
    counts: {
      pending: q.get("SELECT COUNT(*) AS n FROM comments WHERE status='pending'").n,
      approved: q.get("SELECT COUNT(*) AS n FROM comments WHERE status='approved'").n,
      spam: q.get("SELECT COUNT(*) AS n FROM comments WHERE status='spam'").n,
      trash: q.get("SELECT COUNT(*) AS n FROM comments WHERE status='trash'").n,
    },
  });
});

router.post('/comentarios/:id/:acao', (req, res) => {
  const { id, acao } = req.params;
  const back = req.get('referer') || '/admin/comentarios';
  const mapa = { aprovar: 'approved', spam: 'spam', lixo: 'trash', pendente: 'pending' };

  if (acao === 'excluir') {
    q.run('DELETE FROM comments WHERE id = ?', id);
  } else if (mapa[acao]) {
    q.run('UPDATE comments SET status = ? WHERE id = ?', mapa[acao], id);
  } else if (acao === 'responder') {
    const parent = q.get('SELECT * FROM comments WHERE id = ?', id);
    const texto = String(req.body.resposta || '').trim();
    if (parent && texto) {
      q.run(
        `INSERT INTO comments (post_id, parent_id, author_name, body, status, by_owner)
         VALUES (?,?,?,?,'approved',1)`,
        parent.post_id,
        parent.id,
        req.user.name,
        texto,
      );
      if (parent.status === 'pending') {
        q.run("UPDATE comments SET status = 'approved' WHERE id = ?", parent.id);
      }
    }
  }
  res.redirect(back);
});

/** Analisa um comentário com a IA e devolve veredito + resposta sugerida. */
router.post('/api/comentario/:id/analisar', async (req, res) => {
  const c = q.get(
    `SELECT co.*, p.title AS post_title FROM comments co JOIN posts p ON p.id = co.post_id
      WHERE co.id = ?`,
    req.params.id,
  );
  if (!c) return res.status(404).json({ erro: 'Comentário não encontrado.' });

  const heuristica = intel.spamScore({ body: c.body, author_name: c.author_name });
  if (!ai.enabled()) return res.json({ heuristica, ia: null });

  const ia = await ai.reviewComment({
    comment: c.body,
    author: c.author_name,
    postTitle: c.post_title,
  });
  res.json({ heuristica, ia });
});

/* --------------------------------------------------------------- mídia  */

router.get('/midia', (req, res) => {
  res.render('admin/midia', {
    title: 'Imagens',
    media: q.all('SELECT * FROM media ORDER BY created_at DESC LIMIT 200'),
  });
});

router.post('/midia/enviar', upload.array('arquivos', 10), (req, res) => {
  for (const f of req.files || []) {
    q.run(
      'INSERT INTO media (filename, original, mime, size, alt) VALUES (?,?,?,?,?)',
      `/uploads/${f.filename}`,
      f.originalname,
      f.mimetype,
      f.size,
      '',
    );
  }
  res.redirect(`/admin/midia?ok=${encodeURIComponent(`${(req.files || []).length} imagem(ns) enviada(s).`)}`);
});

router.post('/midia/:id/excluir', (req, res) => {
  const m = q.get('SELECT * FROM media WHERE id = ?', req.params.id);
  if (m) {
    const file = path.join(UPLOAD_DIR, path.basename(m.filename));
    fs.rm(file, { force: true }, () => {});
    q.run('DELETE FROM media WHERE id = ?', m.id);
  }
  res.redirect('/admin/midia?ok=Imagem removida.');
});

router.post('/midia/:id/alt', (req, res) => {
  q.run(
    'UPDATE media SET alt = ?, credit = ? WHERE id = ?',
    String(req.body.alt || '').slice(0, 200),
    String(req.body.credit || '').slice(0, 200),
    req.params.id,
  );
  res.redirect('/admin/midia?ok=Descrição salva.');
});

/* ------------------------------------------------------------ mensagens */

router.get('/mensagens', (req, res) => {
  const rows = q.all('SELECT * FROM messages ORDER BY created_at DESC LIMIT 200');
  q.run("UPDATE messages SET read_at = datetime('now') WHERE read_at IS NULL");
  res.render('admin/mensagens', {
    title: 'Mensagens',
    messages: rows,
    subscribers: q.all('SELECT * FROM subscribers ORDER BY created_at DESC LIMIT 200'),
  });
});

router.post('/mensagens/:id/excluir', (req, res) => {
  q.run('DELETE FROM messages WHERE id = ?', req.params.id);
  res.redirect('/admin/mensagens?ok=Mensagem excluída.');
});

/* --------------------------------------------------- currículo/conteúdo */

const CV_TABLES = {
  publicacoes: {
    table: 'publications',
    label: 'Publicações',
    order: 'year DESC, position',
    fields: [
      { name: 'person_id', label: 'De quem é este registro', type: 'pessoa' },
      { name: 'year', label: 'Ano', type: 'number', required: true },
      { name: 'authors', label: 'Autores', type: 'textarea' },
      { name: 'title', label: 'Título', type: 'textarea', required: true },
      { name: 'venue', label: 'Veículo (revista/editora)', type: 'text' },
      { name: 'details', label: 'Detalhes (volume, páginas)', type: 'text' },
      { name: 'doi', label: 'DOI', type: 'text' },
      { name: 'url', label: 'Link', type: 'text' },
      { name: 'citations', label: 'Citações', type: 'number' },
      { name: 'kind', label: 'Tipo', type: 'select', options: ['artigo', 'livro', 'capitulo'] },
      { name: 'highlight', label: 'Destacar', type: 'checkbox' },
    ],
  },
  projetos: {
    table: 'projects',
    label: 'Projetos',
    order: 'position, id',
    fields: [
      { name: 'person_id', label: 'De quem é este registro', type: 'pessoa' },
      { name: 'title', label: 'Título', type: 'textarea', required: true },
      { name: 'period', label: 'Período', type: 'text' },
      { name: 'role', label: 'Papel', type: 'text' },
      { name: 'funder', label: 'Financiador', type: 'text' },
      { name: 'status', label: 'Situação', type: 'text' },
      {
        name: 'kind',
        label: 'Tipo',
        type: 'select',
        options: ['pesquisa', 'extensao', 'desenvolvimento'],
      },
      { name: 'description', label: 'Descrição', type: 'textarea' },
      { name: 'position', label: 'Ordem', type: 'number' },
    ],
  },
  linhas: {
    table: 'research_lines',
    label: 'Linhas de pesquisa',
    order: 'position, id',
    fields: [
      { name: 'person_id', label: 'De quem é este registro', type: 'pessoa' },
      { name: 'title', label: 'Título', type: 'text', required: true },
      { name: 'summary', label: 'Resumo', type: 'textarea' },
      { name: 'keywords', label: 'Palavras-chave', type: 'text' },
      { name: 'icon', label: 'Ícone (emoji)', type: 'text' },
      { name: 'position', label: 'Ordem', type: 'number' },
    ],
  },
  trajetoria: {
    table: 'timeline',
    label: 'Trajetória e formação',
    order: 'sort_year DESC',
    fields: [
      { name: 'person_id', label: 'De quem é este registro', type: 'pessoa' },
      { name: 'period', label: 'Período', type: 'text', required: true },
      { name: 'sort_year', label: 'Ano (ordenação)', type: 'number' },
      { name: 'title', label: 'Título', type: 'text', required: true },
      { name: 'org', label: 'Instituição', type: 'text' },
      { name: 'description', label: 'Descrição', type: 'textarea' },
      {
        name: 'kind',
        label: 'Tipo',
        type: 'select',
        options: ['carreira', 'gestao', 'formacao'],
      },
    ],
  },
  docencia: {
    table: 'teaching',
    label: 'Disciplinas ministradas',
    order: 'position, id',
    fields: [
      { name: 'person_id', label: 'De quem é este registro', type: 'pessoa' },
      { name: 'period', label: 'Período', type: 'text', required: true },
      { name: 'course', label: 'Curso', type: 'text', required: true },
      { name: 'level', label: 'Nível', type: 'text' },
      { name: 'subjects', label: 'Disciplinas', type: 'textarea' },
      { name: 'org', label: 'Instituição', type: 'text' },
      { name: 'position', label: 'Ordem', type: 'number' },
    ],
  },
  orientacoes: {
    table: 'mentorships',
    label: 'Orientações',
    order: 'year DESC, student',
    fields: [
      { name: 'person_id', label: 'De quem é este registro', type: 'pessoa' },
      { name: 'year', label: 'Ano', type: 'number', required: true },
      { name: 'student', label: 'Orientando(a)', type: 'text', required: true },
      { name: 'title', label: 'Título do trabalho', type: 'textarea' },
      {
        name: 'kind',
        label: 'Tipo',
        type: 'select',
        options: ['doutorado', 'mestrado', 'tcc', 'iniciacao', 'outra'],
      },
      { name: 'role', label: 'Papel', type: 'select', options: ['Orientadora', 'Coorientadora'] },
      { name: 'status', label: 'Situação', type: 'select', options: ['concluída', 'em andamento'] },
      { name: 'institution', label: 'Curso / instituição', type: 'text' },
      { name: 'funding', label: 'Financiamento', type: 'text' },
    ],
  },
  premios: {
    table: 'awards',
    label: 'Prêmios',
    order: 'year DESC',
    fields: [
      { name: 'person_id', label: 'De quem é este registro', type: 'pessoa' },
      { name: 'year', label: 'Ano', type: 'number', required: true },
      { name: 'title', label: 'Título', type: 'textarea', required: true },
      { name: 'org', label: 'Concedido por', type: 'text' },
    ],
  },
  categorias: {
    table: 'categories',
    label: 'Categorias do blog',
    order: 'position, name',
    fields: [
      { name: 'name', label: 'Nome', type: 'text', required: true },
      { name: 'slug', label: 'Endereço (slug)', type: 'text' },
      { name: 'description', label: 'Descrição', type: 'textarea' },
      { name: 'color', label: 'Cor', type: 'text' },
      { name: 'position', label: 'Ordem', type: 'number' },
    ],
  },
};

router.get('/curriculo/:secao?', (req, res, next) => {
  const key = req.params.secao || 'publicacoes';
  const cfg = CV_TABLES[key];
  if (!cfg) return next();
  const editing = req.query.editar
    ? q.get(`SELECT * FROM ${cfg.table} WHERE id = ?`, req.query.editar)
    : null;

  const quem = parseInt(req.query.quem, 10) || null;
  const ondePessoa = quem ? 'WHERE person_id = ?' : '';
  const argsPessoa = quem ? [quem] : [];

  res.render('admin/curriculo', {
    title: cfg.label,
    secoes: Object.entries(CV_TABLES).map(([k, v]) => ({ key: k, label: v.label })),
    key,
    cfg,
    rows: q.all(
      `SELECT * FROM ${cfg.table} ${ondePessoa} ORDER BY ${cfg.order} LIMIT 500`,
      ...argsPessoa,
    ),
    quem,
    contagens: q.all(
      `SELECT person_id, COUNT(*) AS n FROM ${cfg.table} GROUP BY person_id`,
    ),
    editing,
  });
});

router.post('/curriculo/:secao/salvar', (req, res, next) => {
  const cfg = CV_TABLES[req.params.secao];
  if (!cfg) return next();
  const id = parseInt(req.body.id, 10) || 0;

  const data = {};
  for (const f of cfg.fields) {
    let value = req.body[f.name];
    if (f.type === 'checkbox') value = value ? 1 : 0;
    else if (f.type === 'pessoa') value = parseInt(value, 10) || null;
    else if (f.type === 'number') value = value === '' || value == null ? 0 : Number(value);
    else value = String(value ?? '').trim();
    data[f.name] = value;
  }
  if (cfg.table === 'categories' && !data.slug) data.slug = intel.slugify(data.name);

  if (id) {
    const cols = Object.keys(data).map((k) => `${k} = ?`).join(', ');
    q.run(`UPDATE ${cfg.table} SET ${cols} WHERE id = ?`, ...Object.values(data), id);
  } else {
    const cols = Object.keys(data).join(', ');
    const marks = Object.keys(data).map(() => '?').join(', ');
    q.run(`INSERT INTO ${cfg.table} (${cols}) VALUES (${marks})`, ...Object.values(data));
  }
  log(req.user.id, `cv.${cfg.table}.save`, data.title || data.name || '');
  res.redirect(`/admin/curriculo/${req.params.secao}?ok=Registro salvo.`);
});

router.post('/curriculo/:secao/:id/excluir', (req, res, next) => {
  const cfg = CV_TABLES[req.params.secao];
  if (!cfg) return next();
  q.run(`DELETE FROM ${cfg.table} WHERE id = ?`, req.params.id);
  res.redirect(`/admin/curriculo/${req.params.secao}?ok=Registro excluído.`);
});

/* -------------------------------------------------------------- ajustes */

router.get('/ajustes', (req, res) => {
  res.render('admin/ajustes', {
    title: 'Ajustes',
    values: getSettings(),
    conta: req.user,
    aiModel: ai.MODEL,
  });
});

const SETTING_KEYS = [
  'site_title',
  'site_tagline',
  'site_description',
  'owner_name',
  'owner_short',
  'owner_role',
  'contact_email',
  'lattes_url',
  'orcid_url',
  'scientia_url',
  'instagram_url',
  'linkedin_url',
  'comment_policy',
  'posts_per_page',
  'hero_image',
  'portrait_image',
];

router.post('/ajustes', (req, res) => {
  for (const key of SETTING_KEYS) {
    if (key in req.body) setSetting(key, String(req.body[key] ?? '').trim());
  }
  log(req.user.id, 'settings.update');
  res.redirect('/admin/ajustes?ok=Ajustes salvos.');
});

router.post('/ajustes/senha', (req, res) => {
  const atual = String(req.body.atual || '');
  const nova = String(req.body.nova || '');
  const confirma = String(req.body.confirma || '');
  const fail = (m) => res.redirect(`/admin/ajustes?erro=${encodeURIComponent(m)}`);

  if (!auth.verifyPassword(atual, req.user.password_hash)) return fail('Senha atual incorreta.');
  if (nova !== confirma) return fail('A confirmação não confere.');
  const problema = auth.passwordProblem(nova);
  if (problema) return fail(problema);

  q.run('UPDATE users SET password_hash = ? WHERE id = ?', auth.hashPassword(nova), req.user.id);
  q.run('DELETE FROM sessions WHERE user_id = ? AND id != ?', req.user.id, req.sessionId);
  log(req.user.id, 'password.change');
  res.redirect('/admin/ajustes?ok=Senha alterada.');
});

router.post('/ajustes/perfil', (req, res) => {
  q.run(
    'UPDATE users SET name = ?, email = ?, bio = ?, avatar = ? WHERE id = ?',
    String(req.body.name || '').trim(),
    String(req.body.email || '').trim(),
    String(req.body.bio || '').trim(),
    String(req.body.avatar || '').trim(),
    req.user.id,
  );
  res.redirect('/admin/ajustes?ok=Perfil atualizado.');
});

/* --------------------------------------------------------------- backup */

router.get('/backup.json', (req, res) => {
  const dump = {};
  const tables = [
    'posts',
    'categories',
    'tags',
    'post_tags',
    'comments',
    'publications',
    'projects',
    'research_lines',
    'timeline',
    'awards',
    'settings',
    'messages',
    'subscribers',
    'media',
  ];
  for (const t of tables) dump[t] = q.all(`SELECT * FROM ${t}`);
  dump._exported_at = new Date().toISOString();
  res
    .type('application/json')
    .set(
      'Content-Disposition',
      `attachment; filename="backup-site-${new Date().toISOString().slice(0, 10)}.json"`,
    )
    .send(JSON.stringify(dump, null, 2));
});

module.exports = router;
