'use strict';

/* =========================================================================
   Monta o aplicativo Express.
   Quem chama é o server.js (máquina local) ou api/index.js (Vercel).
   ========================================================================= */

const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { q, init, getSettings, reindexPost } = require('./db');
const { attachUser } = require('./auth');

const RAIZ = path.join(__dirname, '..');

/**
 * Envolve um manipulador assíncrono para que uma promessa rejeitada chegue
 * ao tratador de erros do Express — no Express 4 isso não acontece sozinho.
 */
function aguardar(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function criarApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(RAIZ, 'views'));
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(
    express.static(path.join(RAIZ, 'public'), {
      maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    }),
  );

  // garante o esquema antes de qualquer consulta (barato depois da primeira vez)
  app.use(aguardar(async (req, res, next) => {
    await init();
    next();
  }));

  app.use(aguardar(attachUser));

  /* ---------------------------------------- variáveis de toda view --- */

  app.use(aguardar(async (req, res, next) => {
    res.locals.settings = await getSettings();
    res.locals.path = req.path;
    res.locals.query = req.query;
    res.locals.year = new Date().getFullYear();
    res.locals.categories = await q.all('SELECT * FROM categories ORDER BY position, name');
    res.locals.flash = req.query.ok || req.query.erro || null;
    res.locals.flashType = req.query.erro ? 'erro' : 'ok';
    next();
  }));

  /* ------------------------------------------------------- rotas ---- */

  app.use('/admin', require('./routes/admin'));
  app.use('/', require('./routes/public'));

  /* ------------------------------------------------------- erros ---- */

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

  return app;
}

/**
 * Publica os posts cujo horário de agendamento já passou.
 * Na máquina local roda num intervalo; no Vercel, numa tarefa agendada
 * (ver a seção "crons" do vercel.json).
 */
async function publicarAgendados() {
  await init();
  const due = await q.all(
    "SELECT id FROM posts WHERE status = 'scheduled' AND published_at <= datetime('now')",
  );
  for (const p of due) {
    await q.run("UPDATE posts SET status = 'published' WHERE id = ?", p.id);
    await reindexPost(p.id);
    console.log(`[agenda] post ${p.id} publicado`);
  }
  return due.length;
}

module.exports = { criarApp, publicarAgendados, aguardar };
