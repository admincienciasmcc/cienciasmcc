'use strict';

/* =========================================================================
   Diagnóstico do ambiente: /api/saude
   Mostra o que está presente e o que falha, sem revelar nenhum segredo.
   ========================================================================= */

const path = require('node:path');
const fs = require('node:fs');

const RAIZ = path.join(__dirname, '..');

function existe(rel) {
  try { return fs.existsSync(path.join(RAIZ, rel)); } catch { return false; }
}

function semSegredo(msg) {
  return String(msg || '')
    .replace(/postgres(ql)?:\/\/[^@\s]+@/g, 'postgresql://•••@')
    .replace(/(sb_secret_|eyJ)[\w.-]+/g, '•••');
}

module.exports = async (req, res) => {
  let db = null;
  let erroCarga = null;
  try { db = require('../src/db'); } catch (e) { erroCarga = e; }   // também lê o .env local
  const url = process.env.DATABASE_URL || '';
  const r = {
    node: process.version,
    regiao: process.env.VERCEL_REGION || null,
    variaveis: {
      DATABASE_URL: Boolean(url),
      DATABASE_URL_porta_6543: /:6543\//.test(url),
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_KEY: Boolean(process.env.SUPABASE_SERVICE_KEY),
      SUPABASE_BUCKET: process.env.SUPABASE_BUCKET || null,
    },
    arquivos: {
      'views/public/home.ejs': existe('views/public/home.ejs'),
      'views/partials/head.ejs': existe('views/partials/head.ejs'),
      'public/css/site.css': existe('public/css/site.css'),
      'src/lattes/publicacoes.js': existe('src/lattes/publicacoes.js'),
    },
    banco: null,
    app: null,
  };

  try {
    if (erroCarga) throw erroCarga;
    const { init, q } = db;
    await init();
    const n = await q.get('SELECT COUNT(*)::int AS n FROM posts');
    r.banco = { ok: true, posts: n.n };
  } catch (e) {
    r.banco = { ok: false, erro: semSegredo(e.message) };
  }

  try {
    const { criarApp } = require('../src/app');
    const app = criarApp();
    const html = await new Promise((resolve, reject) => {
      app.render('public/404', {
        title: 'teste', settings: { site_title: 't', site_tagline: '', site_description: '' },
        path: '/', query: {}, year: 2026, categories: [], flash: null, flashType: 'ok',
        pessoas: [], user: null,
      }, (err, out) => (err ? reject(err) : resolve(out)));
    });
    r.app = { ok: true, template_bytes: html.length };
  } catch (e) {
    r.app = { ok: false, erro: semSegredo(e.message).slice(0, 400) };
  }

  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(r, null, 2));
};
