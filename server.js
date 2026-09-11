'use strict';

const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { q, getSettings } = require('./src/db');
const { attachUser } = require('./src/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  }),
);
app.use(attachUser);

/* ------------------------------------------------ variáveis de toda view */

app.use((req, res, next) => {
  res.locals.settings = getSettings();
  res.locals.path = req.path;
  res.locals.query = req.query;
  res.locals.year = new Date().getFullYear();
  res.locals.categories = q.all('SELECT * FROM categories ORDER BY position, name');
  res.locals.flash = req.query.ok || req.query.erro || null;
  res.locals.flashType = req.query.erro ? 'erro' : 'ok';
  next();
});

/* ---------------------------------------- publicação de posts agendados  */

function publishScheduled() {
  const due = q.all(
    "SELECT id FROM posts WHERE status = 'scheduled' AND published_at <= datetime('now')",
  );
  if (!due.length) return;
  const { reindexPost } = require('./src/db');
  for (const p of due) {
    q.run("UPDATE posts SET status = 'published' WHERE id = ?", p.id);
    reindexPost(p.id);
    console.log(`[agenda] post ${p.id} publicado`);
  }
}
publishScheduled();
setInterval(publishScheduled, 60_000).unref();

/* ------------------------------------------------------------- rotas    */

app.use('/admin', require('./src/routes/admin'));
app.use('/', require('./src/routes/public'));

/* ------------------------------------------------------------- erros    */

app.use((req, res) => {
  res.status(404).render('public/404', { title: 'Página não encontrada' });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render('public/404', {
    title: 'Algo deu errado',
    message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
  });
});

app.listen(PORT, () => {
  console.log(`\n  Site no ar em http://localhost:${PORT}`);
  console.log(`  Administrador em http://localhost:${PORT}/admin\n`);
});
