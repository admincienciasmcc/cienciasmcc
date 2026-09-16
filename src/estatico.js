'use strict';

/* =========================================================================
   Gera uma cópia estática do lado público, para hospedar no Netlify.

   O site de verdade é um servidor com banco. Aqui ele sobe numa porta
   interna, é percorrido página por página e cada resposta vira um arquivo
   HTML em site-estatico/.

   O que não sobrevive, por não haver servidor do outro lado:
     · painel administrativo
     · comentários, contato e newsletter (os formulários são desativados)
     · busca do blog
     · contador de leituras

   Endereços com "?" viram caminhos, porque arquivo estático não lê query:
     /blog?quem=sonia-bonduki      →  /blog/de/sonia-bonduki/
     /blog?categoria=amazonia      →  /blog/categoria/amazonia/
     /blog?tag=veneno              →  /blog/tag/veneno/
     /publicacoes?tipo=livro       →  /publicacoes/tipo/livro/
   ========================================================================= */

const path = require('node:path');
const fs = require('node:fs/promises');

const { criarApp } = require('./app');
const { init, q, encerrar } = require('./db');

const SAIDA = path.join(__dirname, '..', 'site-estatico');
const PUBLICO = path.join(__dirname, '..', 'public');

/* --------------------------------------------------- query → caminho --- */

const MAPA_QUERY = {
  quem: 'de',
  categoria: 'categoria',
  tag: 'tag',
  tipo: 'tipo',
};

/** '/blog?quem=x&tag=y' → '/blog/de/x/tag/y' */
function paraCaminho(url) {
  const [base, busca] = url.split('?');
  if (!busca) return base;
  const partes = [];
  for (const [chave, valor] of new URLSearchParams(busca)) {
    const pasta = MAPA_QUERY[chave];
    if (!pasta || !valor) continue;          // ?q= e ?pagina= não viram arquivo
    partes.push(pasta, encodeURIComponent(valor));
  }
  if (!partes.length) return base;
  return `${base.replace(/\/$/, '')}/${partes.join('/')}`;
}

/** Onde o arquivo é gravado no disco. */
function arquivoDe(caminho) {
  if (/\.(xml|txt|json)$/.test(caminho)) return path.join(SAIDA, caminho);
  const limpo = caminho.replace(/^\/+|\/+$/g, '');
  return path.join(SAIDA, limpo, 'index.html');
}

/* -------------------------------------------------------- servidor ---- */

async function subirServidor() {
  await init();
  const app = criarApp();
  return new Promise((resolve) => {
    const servidor = app.listen(0, '127.0.0.1', () => {
      const { port } = servidor.address();
      resolve({ servidor, base: `http://127.0.0.1:${port}` });
    });
  });
}

/* --------------------------------------------- ajustes no HTML salvo -- */

function ajustarHtml(html, base) {
  let out = html.replace(new RegExp(base, 'g'), '');

  // endereços com "?" viram caminhos, para casar com os arquivos gerados
  out = out.replace(/(href=")(\/[^"]*\?[^"]*)(")/g, (m, a, url, z) => {
    const novo = paraCaminho(url);
    return novo === url.split('?')[0] && url.includes('?') && !/[?&](quem|categoria|tag|tipo)=/.test(url)
      ? `${a}${url.split('?')[0]}${z}`
      : `${a}${novo}/${z}`.replace(/\/\/+$/, '/');
  });

  /*
   * Formulários sem servidor do outro lado: viram aviso.
   * O de comentário vem primeiro — o endereço dele começa com /blog e seria
   * capturado pelo padrão da busca.
   */
  out = out.replace(
    /<form[^>]*action="\/blog\/[^"]*\/comentar"[^>]*>[\s\S]*?<\/form>/g,
    '<p class="small muted" data-estatico>Os comentários voltam quando o site estiver no servidor definitivo.</p>',
  );
  out = out.replace(
    /<form[^>]*action="\/(blog|contato|inscrever)"[^>]*>[\s\S]*?<\/form>/g,
    (m, qual) => {
      const rotulo = {
        blog: 'A busca precisa do servidor e está desligada nesta versão.',
        contato: 'O formulário de contato está desligado nesta versão.',
        inscrever: 'As inscrições estão desligadas nesta versão.',
      }[qual];
      return `<p class="small muted" data-estatico>${rotulo}</p>`;
    },
  );

  // o painel não existe aqui
  out = out.replace(/<a href="\/admin">[^<]*<\/a>/g, '<span class="muted">área restrita</span>');

  return out;
}

/* ------------------------------------------------------------ varredura */

async function main() {
  const { servidor, base } = await subirServidor();
  const enderecoFinal = (process.env.SITE_URL || '').replace(/\/$/, '');

  console.log('\nGerando cópia estática\n');
  if (!enderecoFinal) {
    console.log('  Atenção: SITE_URL não definida.');
    console.log('  O RSS e o sitemap precisam de endereços absolutos. Depois que o');
    console.log('  Netlify te der o endereço, rode de novo assim:');
    console.log('    SITE_URL=https://seu-site.netlify.app npm run estatico\n');
  }

  /* páginas com filtro precisam ser listadas explicitamente */
  const pessoas = await q.all('SELECT slug FROM people WHERE active = 1');
  const categorias = await q.all('SELECT slug FROM categories');
  const tags = await q.all(
    'SELECT DISTINCT t.slug FROM tags t JOIN post_tags pt ON pt.tag_id = t.id',
  );
  const tiposPub = await q.all('SELECT DISTINCT kind FROM publications');
  const tiposOri = await q.all('SELECT DISTINCT kind FROM mentorships');
  const posts = await q.all(
    "SELECT slug FROM posts WHERE status = 'published' ORDER BY published_at DESC",
  );

  const fila = [
    '/', '/blog', '/sobre', '/pesquisa', '/publicacoes', '/orientacoes',
    '/extensao', '/contato', '/feed.xml', '/sitemap.xml', '/robots.txt',
    ...posts.map((p) => `/blog/${p.slug}`),
    ...pessoas.map((p) => `/sobre/${p.slug}`),
    ...pessoas.map((p) => `/blog?quem=${p.slug}`),
    ...pessoas.map((p) => `/pesquisa?quem=${p.slug}`),
    ...pessoas.map((p) => `/publicacoes?quem=${p.slug}`),
    ...pessoas.map((p) => `/orientacoes?quem=${p.slug}`),
    ...pessoas.map((p) => `/extensao?quem=${p.slug}`),
    ...categorias.map((c) => `/blog?categoria=${c.slug}`),
    ...tags.map((t) => `/blog?tag=${t.slug}`),
    ...tiposPub.map((t) => `/publicacoes?tipo=${t.kind}`),
    ...tiposOri.map((t) => `/orientacoes?tipo=${t.kind}`),
  ];

  await fs.rm(SAIDA, { recursive: true, force: true });
  await fs.mkdir(SAIDA, { recursive: true });

  let ok = 0;
  const falhas = [];

  for (const url of fila) {
    const resposta = await fetch(base + url);
    if (!resposta.ok) {
      falhas.push(`${url} → ${resposta.status}`);
      continue;
    }
    const tipo = resposta.headers.get('content-type') || '';
    let corpo = await resposta.text();
    if (tipo.includes('html')) corpo = ajustarHtml(corpo, base);
    else corpo = corpo.replace(new RegExp(base, 'g'), enderecoFinal);

    const destino = arquivoDe(paraCaminho(url));
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, corpo, 'utf8');
    ok += 1;
  }

  /* página de erro do Netlify */
  const erro = await fetch(base + '/pagina-que-nao-existe');
  await fs.writeFile(path.join(SAIDA, '404.html'), ajustarHtml(await erro.text(), base), 'utf8');

  /* arquivos estáticos: css, js, fontes e imagens */
  await fs.cp(PUBLICO, SAIDA, { recursive: true });

  /* o Netlify entende este arquivo */
  await fs.writeFile(
    path.join(SAIDA, '_redirects'),
    [
      '# a busca e o painel não existem na cópia estática',
      '/admin/*   /404.html   404',
      '/blog?q=*  /blog       302',
      '',
    ].join('\n'),
    'utf8',
  );

  servidor.close();
  await encerrar();

  console.log(`  ${ok} páginas geradas em site-estatico/`);
  if (falhas.length) {
    console.log(`  ${falhas.length} falha(s):`);
    falhas.forEach((f) => console.log('    ' + f));
  }
  console.log('\n  Para publicar: arraste a pasta site-estatico/ em app.netlify.com/drop\n');
}

main().catch(async (err) => {
  console.error('\nFalhou:', err.message, '\n');
  await encerrar().catch(() => {});
  process.exit(1);
});
