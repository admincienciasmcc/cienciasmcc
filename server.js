'use strict';

/* Servidor para a máquina local. No Vercel quem entra é api/index.js. */

const { criarApp, publicarAgendados } = require('./src/app');
const { init } = require('./src/db');

const PORT = process.env.PORT || 3000;

(async () => {
  await init();

  const app = criarApp();

  await publicarAgendados().catch((e) => console.error('[agenda]', e.message));
  setInterval(() => publicarAgendados().catch((e) => console.error('[agenda]', e.message)), 60_000)
    .unref();

  app.listen(PORT, () => {
    console.log(`\n  Site no ar em http://localhost:${PORT}`);
    console.log(`  Administrador em http://localhost:${PORT}/admin\n`);
  });
})().catch((err) => {
  console.error('\nNão foi possível subir o servidor:\n ', err.message, '\n');
  process.exit(1);
});
