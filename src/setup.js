'use strict';

/* =========================================================================
   Confere a conexão com o Supabase e prepara o que o site precisa.
   Uso: npm run setup
   ========================================================================= */

const { init, q, encerrar } = require('./db');
const storage = require('./storage');

function marca(ok) {
  return ok ? '  ✓' : '  ✗';
}

async function main() {
  console.log('\nConferindo a instalação\n');

  /* ------------------------------------------------------------ banco */
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(marca(false), 'DATABASE_URL não definida');
    console.log('      O site vai usar o Postgres embutido em data/pg.');
    console.log('      Para o Supabase, copie .env.example para .env e preencha.\n');
  } else {
    const host = url.replace(/\/\/[^@]*@/, '//••••@').split('@')[1] || '(?)';
    console.log(marca(true), `DATABASE_URL apontando para ${host}`);
    if (!/6543/.test(url)) {
      console.log('      Atenção: a porta não é 6543. No Vercel use o "Transaction pooler"');
      console.log('      do Supabase, senão as conexões se esgotam.');
    }
  }

  await init();
  console.log(marca(true), 'esquema criado/conferido');

  const tabelas = await q.all(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
  );
  console.log(marca(true), `${tabelas.length} tabelas`);

  const dicionario = await q.get(
    "SELECT COUNT(*)::int AS n FROM pg_ts_config WHERE cfgname = 'portuguese'",
  );
  console.log(marca(dicionario.n > 0), 'dicionário de português para a busca');

  const posts = await q.get('SELECT COUNT(*)::int AS n FROM posts');
  const pessoas = await q.get('SELECT COUNT(*)::int AS n FROM people');
  const pubs = await q.get('SELECT COUNT(*)::int AS n FROM publications');
  console.log(marca(true), `conteúdo: ${pessoas.n} autoras · ${posts.n} posts · ${pubs.n} publicações`);
  if (!pessoas.n) {
    console.log('      Banco vazio. Rode, nesta ordem:');
    console.log('        npm run seed && npm run lattes && npm run pessoas');
  }

  /* ---------------------------------------------------------- imagens */
  if (!storage.remoto()) {
    console.log(marca(false), 'Supabase Storage não configurado');
    console.log('      As imagens enviadas vão para public/uploads/, que o Vercel');
    console.log('      apaga a cada implantação. Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.');
  } else {
    const r = await storage.prepararBucket();
    if (r.ok) {
      console.log(marca(true), `bucket "${r.bucket}"${r.criado ? ' criado agora' : ' já existia'}`);
    } else {
      console.log(marca(false), `bucket: ${r.motivo}`);
    }
  }

  console.log('');
}

main()
  .then(encerrar)
  .catch(async (err) => {
    console.error('\nFalhou:', err.message, '\n');
    await encerrar().catch(() => {});
    process.exit(1);
  });
