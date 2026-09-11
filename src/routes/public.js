'use strict';

const express = require('express');
const { q, getSettings, log } = require('../db');
const { renderComment, escapeHtml, outline, renderMarkdown } = require('../markdown');
const intel = require('../intel');

const router = express.Router();

/* ------------------------------------------------------------- pessoas  */

function parseJson(valor, padrao) {
  try { return JSON.parse(valor || ''); } catch { return padrao; }
}

/** Carrega uma pessoa com os campos JSON já convertidos. */
function hidratarPessoa(p) {
  if (!p) return null;
  return { ...p, languages: parseJson(p.languages, []), areas: parseJson(p.areas, []) };
}

function listarPessoas() {
  return q.all('SELECT * FROM people WHERE active = 1 ORDER BY position, id').map(hidratarPessoa);
}

function acharPessoa(slug) {
  return hidratarPessoa(q.get('SELECT * FROM people WHERE slug = ? AND active = 1', slug));
}

/** Resolve ?quem=slug em um filtro de pessoa reutilizável nas listagens. */
function filtroPessoa(req) {
  const slug = String(req.query.quem || '').trim();
  const pessoa = slug ? acharPessoa(slug) : null;
  return { slug: pessoa ? slug : '', pessoa, id: pessoa ? pessoa.id : null };
}

// disponibiliza as duas em todas as páginas
router.use((req, res, next) => {
  res.locals.pessoas = listarPessoas();
  next();
});

/* ------------------------------------------------------------- helpers  */

function tagsOf(postId) {
  return q.all(
    `SELECT t.* FROM tags t JOIN post_tags pt ON pt.tag_id = t.id
      WHERE pt.post_id = ? ORDER BY t.name`,
    postId,
  );
}

function decorate(posts) {
  for (const p of posts) {
    p.tags = tagsOf(p.id);
    p.dateLabel = formatDate(p.published_at);
    p.pessoa = p.person_id
      ? q.get('SELECT slug, short_name, portrait, initials, accent FROM people WHERE id = ?', p.person_id)
      : null;
  }
  return posts;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function formatDate(value) {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T') + (String(value).length <= 10 ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

const PUBLISHED = `p.status = 'published' AND (p.published_at IS NULL OR p.published_at <= datetime('now'))`;

const LIST_SQL = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug, c.color AS category_color
    FROM posts p LEFT JOIN categories c ON c.id = p.category_id
   WHERE ${PUBLISHED}`;

/* ---------------------------------------------------------------- home  */

router.get('/', (req, res) => {
  const featured = decorate(
    q.all(`${LIST_SQL} AND p.featured = 1 ORDER BY p.published_at DESC LIMIT 2`),
  );
  const ids = featured.map((p) => p.id);
  const recent = decorate(
    q.all(
      `${LIST_SQL} ${ids.length ? `AND p.id NOT IN (${ids.join(',')})` : ''}
       ORDER BY p.published_at DESC LIMIT 6`,
    ),
  );
  const lines = q.all('SELECT * FROM research_lines ORDER BY person_id, position');
  const stats = {
    posts: q.get(`SELECT COUNT(*) AS n FROM posts p WHERE ${PUBLISHED}`).n,
    publications: q.get('SELECT COUNT(*) AS n FROM publications').n,
    years: new Date().getFullYear() - 1986,
    orientations: q.get(
      "SELECT COUNT(*) AS n FROM mentorships WHERE kind IN ('doutorado','mestrado')",
    ).n,
  };

  const pessoas = listarPessoas().map((p) => ({
    ...p,
    linhas: q.all(
      'SELECT title, icon FROM research_lines WHERE person_id = ? ORDER BY position LIMIT 4',
      p.id,
    ),
    posts: q.get(
      `SELECT COUNT(*) AS n FROM posts p WHERE ${PUBLISHED} AND p.person_id = ?`,
      p.id,
    ).n,
  }));

  res.render('public/home', { title: null, featured, recent, lines, stats, pessoas });
});

/* ---------------------------------------------------------------- blog  */

router.get('/blog', (req, res) => {
  const settings = getSettings();
  const perPage = Math.max(3, parseInt(settings.posts_per_page, 10) || 9);
  const page = Math.max(1, parseInt(req.query.pagina, 10) || 1);
  const termo = (req.query.q || '').trim();
  const categoria = (req.query.categoria || '').trim();
  const tag = (req.query.tag || '').trim();
  const f = filtroPessoa(req);

  let where = LIST_SQL;
  const params = [];
  let matchedIds = null;

  if (termo) {
    try {
      const hits = q.all(
        'SELECT rowid AS id FROM posts_fts WHERE posts_fts MATCH ? ORDER BY rank LIMIT 200',
        termo.replace(/["']/g, ' ') + '*',
      );
      matchedIds = hits.map((h) => h.id);
    } catch {
      matchedIds = [];
    }
    if (!matchedIds.length) {
      // fallback simples para termos que o FTS não aceita
      where += ' AND (p.title LIKE ? OR p.excerpt LIKE ? OR p.body_md LIKE ?)';
      params.push(`%${termo}%`, `%${termo}%`, `%${termo}%`);
    } else {
      where += ` AND p.id IN (${matchedIds.join(',')})`;
    }
  }
  if (categoria) {
    where += ' AND c.slug = ?';
    params.push(categoria);
  }
  if (tag) {
    where +=
      ' AND p.id IN (SELECT pt.post_id FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.slug = ?)';
    params.push(tag);
  }
  if (f.id) {
    where += ' AND p.person_id = ?';
    params.push(f.id);
  }

  const total = q.get(
    `SELECT COUNT(*) AS n FROM (${where}) AS sub`.replace('SELECT p.*,', 'SELECT p.id,'),
    ...params,
  ).n;

  const posts = decorate(
    q.all(
      `${where} ORDER BY p.published_at DESC LIMIT ? OFFSET ?`,
      ...params,
      perPage,
      (page - 1) * perPage,
    ),
  );

  const pages = Math.max(1, Math.ceil(total / perPage));
  const allTags = q.all(
    `SELECT t.*, COUNT(pt.post_id) AS n FROM tags t
       JOIN post_tags pt ON pt.tag_id = t.id
       JOIN posts p ON p.id = pt.post_id AND ${PUBLISHED}
      GROUP BY t.id ORDER BY n DESC, t.name LIMIT 24`,
  );

  res.render('public/blog', {
    title: 'Blog',
    posts,
    total,
    page,
    pages,
    termo,
    categoria,
    tag,
    allTags,
    filtro: f,
  });
});

/* ---------------------------------------------------------------- post  */

router.get('/blog/:slug', (req, res, next) => {
  const post = q.get(`${LIST_SQL} AND p.slug = ?`, req.params.slug);
  if (!post) return next();

  post.tags = tagsOf(post.id);
  post.dateLabel = formatDate(post.published_at);
  post.outline = outline(post.body_md);
  post.gallery = q.all(
    'SELECT * FROM post_images WHERE post_id = ? ORDER BY position, id',
    post.id,
  );
  post.pessoa = hidratarPessoa(
    q.get('SELECT * FROM people WHERE id = ?', post.person_id) ||
      q.get('SELECT * FROM people ORDER BY position LIMIT 1'),
  );

  // visualizações (contagem simples, uma por sessão de navegador)
  const seen = String(req.cookies.mcs_seen || '').split(',');
  if (!seen.includes(String(post.id))) {
    q.run('UPDATE posts SET views = views + 1 WHERE id = ?', post.id);
    q.run(
      `INSERT INTO post_views (post_id, day, count) VALUES (?, date('now'), 1)
       ON CONFLICT(post_id, day) DO UPDATE SET count = count + 1`,
      post.id,
    );
    res.cookie('mcs_seen', [...seen, post.id].filter(Boolean).slice(-60).join(','), {
      maxAge: 864e5,
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  const comments = q
    .all(
      `SELECT * FROM comments WHERE post_id = ? AND status = 'approved'
        ORDER BY created_at ASC`,
      post.id,
    )
    .map((c) => ({ ...c, html: renderComment(c.body), dateLabel: formatDate(c.created_at) }));

  const roots = comments.filter((c) => !c.parent_id);
  for (const r of roots) r.replies = comments.filter((c) => c.parent_id === r.id);

  // relacionados: mesma categoria ou tags em comum
  const tagIds = post.tags.map((t) => t.id);
  const related = decorate(
    q.all(
      `${LIST_SQL} AND p.id != ?
         AND (p.category_id = ?
              ${tagIds.length ? `OR p.id IN (SELECT post_id FROM post_tags WHERE tag_id IN (${tagIds.join(',')}))` : ''})
       ORDER BY p.published_at DESC LIMIT 3`,
      post.id,
      post.category_id,
    ),
  );

  res.render('public/post', {
    title: post.title,
    post,
    comments: roots,
    commentCount: comments.length,
    related,
    canComment: post.allow_comments && getSettings().comment_policy !== 'closed',
  });
});

/* ------------------------------------------------------------ comentar  */

router.post('/blog/:slug/comentar', (req, res, next) => {
  const post = q.get(`${LIST_SQL} AND p.slug = ?`, req.params.slug);
  if (!post) return next();

  const settings = getSettings();
  const back = `/blog/${post.slug}`;

  if (!post.allow_comments || settings.comment_policy === 'closed') {
    return res.redirect(`${back}?erro=${encodeURIComponent('Os comentários estão fechados.')}`);
  }

  const nome = String(req.body.nome || '').trim().slice(0, 80);
  const email = String(req.body.email || '').trim().slice(0, 120);
  const site = String(req.body.site || '').trim().slice(0, 200);
  const texto = String(req.body.comentario || '').trim().slice(0, 4000);
  const parent = parseInt(req.body.parent_id, 10) || null;
  const started = parseInt(req.body.ts, 10) || 0;

  if (!nome || !texto) {
    return res.redirect(`${back}?erro=${encodeURIComponent('Preencha o nome e o comentário.')}#comentarios`);
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.redirect(`${back}?erro=${encodeURIComponent('E-mail inválido.')}#comentarios`);
  }

  const { score, reasons } = intel.spamScore({
    body: texto,
    author_name: nome,
    author_site: site,
    honeypot: Boolean(String(req.body.website || '').trim()),
    elapsedMs: started ? Date.now() - started : undefined,
  });

  let status = settings.comment_policy === 'auto' ? 'approved' : 'pending';
  if (score >= 60) status = 'spam';
  else if (score >= 30) status = 'pending';

  q.run(
    `INSERT INTO comments
       (post_id, parent_id, author_name, author_email, author_site, body, status,
        spam_score, spam_reason, ip, ua)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    post.id,
    parent,
    nome,
    email,
    site,
    texto,
    status,
    score,
    reasons,
    req.ip || '',
    String(req.get('user-agent') || '').slice(0, 250),
  );

  const msg =
    status === 'approved'
      ? 'Comentário publicado. Obrigada!'
      : 'Comentário enviado! Ele aparece assim que for revisado.';
  res.redirect(`${back}?ok=${encodeURIComponent(msg)}#comentarios`);
});

/* --------------------------------------------------------------- sobre  */

function jsonSetting(settings, key, fallback) {
  try {
    return JSON.parse(settings[key] || '');
  } catch {
    return fallback;
  }
}

router.get('/sobre', (req, res) => {
  const pessoas = listarPessoas().map((p) => ({
    ...p,
    destaques: {
      publicacoes: q.get('SELECT COUNT(*) AS n FROM publications WHERE person_id = ?', p.id).n,
      projetos: q.get('SELECT COUNT(*) AS n FROM projects WHERE person_id = ?', p.id).n,
      orientacoes: q.get('SELECT COUNT(*) AS n FROM mentorships WHERE person_id = ?', p.id).n,
      anos: q.get(
        "SELECT MIN(sort_year) AS a FROM timeline WHERE person_id = ? AND sort_year > 0",
        p.id,
      ).a,
    },
    linhas: q.all(
      'SELECT title, icon FROM research_lines WHERE person_id = ? ORDER BY position LIMIT 4',
      p.id,
    ),
  }));

  res.render('public/sobre', { title: 'Sobre nós', pessoas });
});

/* ------------------------------------------------ perfil individual --- */

router.get('/sobre/:slug', (req, res, next) => {
  const pessoa = acharPessoa(req.params.slug);
  if (!pessoa) return next();

  const outras = listarPessoas().filter((p) => p.id !== pessoa.id);

  res.render('public/pessoa', {
    title: pessoa.short_name,
    pessoa,
    outras,
    carreira: q.all(
      "SELECT * FROM timeline WHERE person_id = ? AND kind = 'carreira' ORDER BY sort_year DESC",
      pessoa.id,
    ),
    gestao: q.all(
      "SELECT * FROM timeline WHERE person_id = ? AND kind = 'gestao' ORDER BY sort_year DESC",
      pessoa.id,
    ),
    formacao: q.all(
      "SELECT * FROM timeline WHERE person_id = ? AND kind = 'formacao' ORDER BY sort_year DESC",
      pessoa.id,
    ),
    awards: q.all('SELECT * FROM awards WHERE person_id = ? ORDER BY year DESC', pessoa.id),
    teaching: q.all('SELECT * FROM teaching WHERE person_id = ? ORDER BY position, id', pessoa.id),
    eventos: q.all(
      "SELECT * FROM projects WHERE person_id = ? AND kind = 'evento' ORDER BY position",
      pessoa.id,
    ),
    linhas: q
      .all('SELECT * FROM research_lines WHERE person_id = ? ORDER BY position', pessoa.id)
      .map((l) => ({ ...l, summaryHtml: renderMarkdown(l.summary || '') })),
    contagens: {
      publicacoes: q.get('SELECT COUNT(*) AS n FROM publications WHERE person_id = ?', pessoa.id).n,
      projetos: q.get(
        "SELECT COUNT(*) AS n FROM projects WHERE person_id = ? AND kind != 'evento'",
        pessoa.id,
      ).n,
      orientacoes: q.get('SELECT COUNT(*) AS n FROM mentorships WHERE person_id = ?', pessoa.id).n,
      disciplinas: q.get('SELECT COUNT(*) AS n FROM teaching WHERE person_id = ?', pessoa.id).n,
      posts: q.get(
        `SELECT COUNT(*) AS n FROM posts p WHERE ${PUBLISHED} AND p.person_id = ?`,
        pessoa.id,
      ).n,
    },
    editoria: parseJson(getSettings().editoria, null),
  });
});

/* ------------------------------------------------------------ pesquisa  */

router.get('/pesquisa', (req, res) => {
  const f = filtroPessoa(req);
  const onde = f.id ? 'AND person_id = ?' : '';
  const args = f.id ? [f.id] : [];

  res.render('public/pesquisa', {
    title: 'Pesquisa',
    filtro: f,
    lines: q
      .all(`SELECT * FROM research_lines WHERE 1=1 ${onde} ORDER BY person_id, position`, ...args)
      .map((l) => ({ ...l, summaryHtml: renderMarkdown(l.summary || '') })),
    projects: q
      .all(
        `SELECT * FROM projects WHERE kind = 'pesquisa' ${onde} ORDER BY person_id, position`,
        ...args,
      )
      .map((p) => ({ ...p, descriptionHtml: renderMarkdown(p.description || '') })),
    totais: parseJson(getSettings().lattes_totais, {}),
  });
});

/* ------------------------------------------------------- orientações   */

router.get('/orientacoes', (req, res) => {
  const f = filtroPessoa(req);
  const tipo = (req.query.tipo || '').trim();

  let sql = 'SELECT * FROM mentorships WHERE 1=1';
  const args = [];
  if (f.id) { sql += ' AND person_id = ?'; args.push(f.id); }
  if (tipo) { sql += ' AND kind = ?'; args.push(tipo); }
  sql += ' ORDER BY year DESC, student';
  const rows = q.all(sql, ...args);

  const ROTULOS = {
    doutorado: 'Teses de doutorado',
    mestrado: 'Dissertações de mestrado',
    tcc: 'Trabalhos de conclusão de curso',
    iniciacao: 'Iniciação científica',
    outra: 'Monitoria, extensão e outras',
  };

  const grupos = new Map();
  for (const r of rows) {
    if (!grupos.has(r.kind)) grupos.set(r.kind, []);
    grupos.get(r.kind).push(r);
  }
  const ordem = ['doutorado', 'mestrado', 'tcc', 'iniciacao', 'outra'];

  res.render('public/orientacoes', {
    title: 'Orientações',
    filtro: f,
    grupos: ordem
      .filter((k) => grupos.has(k))
      .map((k) => ({ kind: k, label: ROTULOS[k], items: grupos.get(k) })),
    contagens: q.all(
      `SELECT kind, COUNT(*) AS n FROM mentorships ${f.id ? 'WHERE person_id = ?' : ''} GROUP BY kind`,
      ...(f.id ? [f.id] : []),
    ),
    rotulos: ROTULOS,
    total: rows.length,
    filtroTipo: tipo,
  });
});

router.get('/extensao', (req, res) => {
  const f = filtroPessoa(req);
  const onde = f.id ? 'AND person_id = ?' : '';
  const args = f.id ? [f.id] : [];

  res.render('public/extensao', {
    title: 'Extensão e divulgação',
    filtro: f,
    projects: q
      .all(
        `SELECT * FROM projects WHERE kind NOT IN ('pesquisa','evento') ${onde}
         ORDER BY person_id, position`,
        ...args,
      )
      .map((p) => ({ ...p, descriptionHtml: renderMarkdown(p.description || '') })),
  });
});

router.get('/publicacoes', (req, res) => {
  const f = filtroPessoa(req);
  const kind = req.query.tipo || '';

  let sql = 'SELECT * FROM publications WHERE 1=1';
  const args = [];
  if (f.id) { sql += ' AND person_id = ?'; args.push(f.id); }
  if (kind) { sql += ' AND kind = ?'; args.push(kind); }
  sql += ' ORDER BY year DESC, position';
  const rows = q.all(sql, ...args);

  const byDecade = new Map();
  for (const p of rows) {
    const dec = `${Math.floor(p.year / 10) * 10}s`;
    if (!byDecade.has(dec)) byDecade.set(dec, []);
    byDecade.get(dec).push(p);
  }

  res.render('public/publicacoes', {
    title: 'Publicações',
    filtro: f,
    groups: [...byDecade.entries()],
    total: rows.length,
    kind,
    kinds: q.all(
      `SELECT kind, COUNT(*) AS n FROM publications ${f.id ? 'WHERE person_id = ?' : ''}
       GROUP BY kind ORDER BY n DESC`,
      ...(f.id ? [f.id] : []),
    ),
  });
});

/* -------------------------------------------------------------- contato */

router.get('/contato', (req, res) => {
  res.render('public/contato', { title: 'Contato' });
});

router.post('/contato', (req, res) => {
  const nome = String(req.body.nome || '').trim().slice(0, 100);
  const email = String(req.body.email || '').trim().slice(0, 150);
  const assunto = String(req.body.assunto || '').trim().slice(0, 150);
  const texto = String(req.body.mensagem || '').trim().slice(0, 5000);

  if (String(req.body.website || '').trim()) return res.redirect('/contato?ok=Mensagem enviada.');
  if (!nome || !email || !texto) {
    return res.redirect(`/contato?erro=${encodeURIComponent('Preencha nome, e-mail e mensagem.')}`);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.redirect(`/contato?erro=${encodeURIComponent('E-mail inválido.')}`);
  }

  q.run(
    'INSERT INTO messages (name, email, subject, body) VALUES (?,?,?,?)',
    nome,
    email,
    assunto,
    texto,
  );
  res.redirect(`/contato?ok=${encodeURIComponent('Mensagem enviada. Obrigada pelo contato!')}`);
});

/* ----------------------------------------------------------- newsletter */

router.post('/inscrever', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase().slice(0, 150);
  const back = req.get('referer') || '/';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.redirect(`${back.split('?')[0]}?erro=${encodeURIComponent('E-mail inválido.')}`);
  }
  q.run('INSERT OR IGNORE INTO subscribers (email) VALUES (?)', email);
  res.redirect(`${back.split('?')[0]}?ok=${encodeURIComponent('Inscrição confirmada!')}`);
});

/* ------------------------------------------------------------ feed/seo  */

router.get('/feed.xml', (req, res) => {
  const settings = getSettings();
  const base = `${req.protocol}://${req.get('host')}`;
  const posts = q.all(`${LIST_SQL} ORDER BY p.published_at DESC LIMIT 20`);

  const items = posts
    .map(
      (p) => `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${base}/blog/${p.slug}</link>
      <guid isPermaLink="true">${base}/blog/${p.slug}</guid>
      <pubDate>${new Date(String(p.published_at).replace(' ', 'T') + 'Z').toUTCString()}</pubDate>
      <description>${escapeHtml(p.excerpt || '')}</description>
    </item>`,
    )
    .join('\n');

  res.type('application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(settings.site_title)}</title>
    <link>${base}</link>
    <description>${escapeHtml(settings.site_description || settings.site_tagline)}</description>
    <language>pt-BR</language>
${items}
  </channel>
</rss>`);
});

router.get('/sitemap.xml', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const urls = ['/', '/blog', '/sobre', '/pesquisa', '/publicacoes', '/orientacoes', '/extensao', '/contato']
    .concat(listarPessoas().map((p) => `/sobre/${p.slug}`));
  const posts = q.all(`${LIST_SQL} ORDER BY p.published_at DESC`);
  const body = [
    ...urls.map((u) => `  <url><loc>${base}${u}</loc></url>`),
    ...posts.map(
      (p) =>
        `  <url><loc>${base}/blog/${p.slug}</loc><lastmod>${String(p.updated_at).slice(0, 10)}</lastmod></url>`,
    ),
  ].join('\n');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`,
  );
});

router.get('/robots.txt', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nSitemap: ${base}/sitemap.xml\n`);
});

module.exports = router;
module.exports.formatDate = formatDate;
