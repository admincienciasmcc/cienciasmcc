'use strict';

/* Tarefa agendada do Vercel: publica os posts cujo horário já chegou. */

const { publicarAgendados } = require('../src/app');

module.exports = async (req, res) => {
  // o Vercel assina as chamadas de cron; fora delas, exige o segredo
  const segredo = process.env.CRON_SECRET;
  const autorizado =
    req.headers['x-vercel-cron']
    || (segredo && req.headers.authorization === `Bearer ${segredo}`);
  if (!autorizado) return res.status(401).json({ erro: 'não autorizado' });

  try {
    const n = await publicarAgendados();
    res.json({ ok: true, publicados: n });
  } catch (e) {
    console.error('[cron]', e);
    res.status(500).json({ erro: e.message });
  }
};
