'use strict';

/**
 * Baixa um conjunto inicial de fotos de licença livre do Wikimedia Commons,
 * registra na galeria do site e ilustra os posts de exemplo.
 *
 *   npm run fotos
 *
 * Todas as imagens têm licença livre (CC BY, CC BY-SA, CC0 ou domínio público)
 * e o crédito do autor é gravado junto — ele aparece sob a foto no site.
 * Para trocar por fotos próprias, basta enviar em Imagens no administrador.
 */

const fs = require('node:fs');
const path = require('node:path');
const { q, UPLOAD_DIR } = require('./db');

/* Curadoria: espécies e temas que aparecem na pesquisa dela. */
const FOTOS = [
  {
    file: 'Common lancehead.jpg',
    slug: 'bothrops-atrox-jararaca',
    alt: 'Jararaca (Bothrops atrox) sobre folhas secas da floresta',
    tema: 'bothrops',
  },
  {
    file: 'Bothrops atrox 32277739.jpg',
    slug: 'bothrops-atrox-detalhe',
    alt: 'Detalhe da cabeça de uma Bothrops atrox',
    tema: 'bothrops',
  },
  {
    file: 'Potamotrygon motoro2.jpg',
    slug: 'potamotrygon-motoro-arraia',
    alt: 'Arraia de água doce Potamotrygon motoro, com as manchas ocelares no dorso',
    tema: 'arraia',
  },
  {
    file: 'Ocellate river stingray, Boston Aquarium.jpg',
    slug: 'arraia-agua-doce-nadando',
    alt: 'Arraia de água doce nadando sobre o fundo arenoso',
    tema: 'arraia',
  },
  {
    file: 'Researcher uses pipettes.jpg',
    slug: 'pesquisa-laboratorio-pipeta',
    alt: 'Pesquisadora usando pipeta em bancada de laboratório',
    tema: 'laboratorio',
  },
  {
    file: 'Laboratory desk.jpg',
    slug: 'bancada-de-laboratorio',
    alt: 'Bancada de laboratório com vidrarias e amostras',
    tema: 'laboratorio',
  },
  {
    file: 'Cascavel - crotalus durissus.jpg',
    slug: 'crotalus-durissus-cascavel',
    alt: 'Cascavel (Crotalus durissus) enrodilhada',
    tema: 'crotalus',
  },
  {
    file: 'Micrurus-camilae closeup.jpg',
    slug: 'micrurus-cobra-coral',
    alt: 'Cobra-coral do gênero Micrurus em close',
    tema: 'coral',
  },
  {
    file: 'Sunset at Amazon rainforest, Brazil - 2026.jpg',
    slug: 'floresta-amazonica-entardecer',
    alt: 'Floresta amazônica ao entardecer',
    tema: 'amazonia',
  },
  {
    file: 'Tambaqui (Colossoma macropomum).jpg',
    slug: 'tambaqui-colossoma-macropomum',
    alt: 'Tambaqui (Colossoma macropomum)',
    tema: 'peixe',
  },
  {
    file: 'Unidentified Melastomataceae 01500.jpg',
    slug: 'melastomataceae-flor',
    alt: 'Flor de Melastomataceae, família da Bellucia dichotoma',
    tema: 'planta',
  },
];

const API = 'https://commons.wikimedia.org/w/api.php';

function limpa(html = '') {
  return String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function metadados(titulos) {
  const url =
    `${API}?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|mime` +
    `&iiurlwidth=1600&titles=${titulos.map((t) => encodeURIComponent('File:' + t)).join('|')}`;
  const data = await fetch(url, { headers: { 'User-Agent': UA } }).then((r) => r.json());
  const out = new Map();
  for (const page of Object.values(data?.query?.pages || {})) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    const m = ii.extmetadata || {};
    out.set(page.title.replace(/^File:/, ''), {
      url: ii.thumburl || ii.url,
      mime: ii.thumbmime || ii.mime,
      autor: limpa(m.Artist?.value) || 'autor não identificado',
      licenca: limpa(m.LicenseShortName?.value) || 'licença livre',
      pagina: ii.descriptionurl,
    });
  }
  return out;
}

const UA = 'SiteMariaCristina/1.0 (blog academico; https://lattes.cnpq.br/4923902785529755)';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** O Commons limita a taxa de download: tentamos de novo com intervalo maior. */
async function buscarArquivo(url, tentativas = 4) {
  for (let i = 1; i <= tentativas; i += 1) {
    const resp = await fetch(url, { headers: { 'User-Agent': UA } });
    if (resp.ok) return Buffer.from(await resp.arrayBuffer());
    if (resp.status !== 429 && resp.status !== 503) throw new Error(`HTTP ${resp.status}`);
    const pausa = Number(resp.headers.get('retry-after')) * 1000 || i * 2500;
    await espera(pausa);
  }
  throw new Error('limite de requisições do Commons (tente de novo em alguns minutos)');
}

async function baixar(foto, meta) {
  const ext = (meta.mime || '').includes('png') ? '.png' : '.jpg';
  const nome = `${foto.slug}${ext}`;
  const destino = path.join(UPLOAD_DIR, nome);
  const publico = `/uploads/${nome}`;

  if (!fs.existsSync(destino)) {
    fs.writeFileSync(destino, await buscarArquivo(meta.url));
    await espera(1200); // gentileza com o servidor do Commons
  }

  const credito = `Foto: ${meta.autor} · ${meta.licenca} · Wikimedia Commons`;
  const size = fs.statSync(destino).size;

  const existente = q.get('SELECT id FROM media WHERE filename = ?', publico);
  if (existente) {
    q.run('UPDATE media SET alt = ?, credit = ? WHERE id = ?', foto.alt, credito, existente.id);
  } else {
    q.run(
      'INSERT INTO media (filename, original, mime, size, alt, credit) VALUES (?,?,?,?,?,?)',
      publico,
      foto.file,
      meta.mime || 'image/jpeg',
      size,
      foto.alt,
      credito,
    );
  }

  return { url: publico, credito, alt: foto.alt, tema: foto.tema, kb: Math.round(size / 1024) };
}

/* Quais fotos ilustram cada post de exemplo. */
const ILUSTRACOES = [
  {
    procura: 'soro antiofídico',
    capa: 'bothrops-atrox-jararaca',
    galeria: [
      { slug: 'bothrops-atrox-detalhe', caption: 'A jararaca (Bothrops atrox) responde pela maioria dos acidentes ofídicos na região Norte.' },
      { slug: 'melastomataceae-flor', caption: 'Melastomataceae — família da Bellucia dichotoma, espécie que estudamos como bloqueadora dos efeitos locais do veneno.' },
      { slug: 'floresta-amazonica-entardecer', caption: 'No interior do Amazonas, a distância entre o acidente e o hospital se mede em horas ou dias de barco.' },
    ],
  },
  {
    procura: 'Arraias de água doce',
    capa: 'potamotrygon-motoro-arraia',
    galeria: [
      { slug: 'arraia-agua-doce-nadando', caption: 'A arraia não ataca: ela se esconde sob a areia. O acidente acontece quando alguém pisa em seu dorso.' },
      { slug: 'tambaqui-colossoma-macropomum', caption: 'Tambaqui — outra espécie amazônica cujas imunoglobulinas estudamos no laboratório.' },
    ],
  },
  {
    procura: 'saliva de estudantes',
    capa: 'pesquisa-laboratorio-pipeta',
    galeria: [
      { slug: 'bancada-de-laboratorio', caption: 'As amostras de saliva foram analisadas para imunoglobulinas, proteínas totais, amilase e fenotipagem celular.' },
    ],
  },
];

async function main() {
  console.log('Buscando informações das fotos no Wikimedia Commons…\n');
  const meta = await metadados(FOTOS.map((f) => f.file));

  const baixadas = new Map();
  for (const foto of FOTOS) {
    const m = meta.get(foto.file);
    if (!m) {
      console.log(`  ✗ ${foto.slug}: não encontrada`);
      continue;
    }
    try {
      const r = await baixar(foto, m);
      baixadas.set(foto.slug, r);
      console.log(`  ✓ ${foto.slug} (${r.kb} KB) — ${m.autor}, ${m.licenca}`);
    } catch (err) {
      console.log(`  ✗ ${foto.slug}: ${err.message}`);
    }
  }

  console.log('\nIlustrando os posts de exemplo…');
  for (const ilustra of ILUSTRACOES) {
    const post = q.get('SELECT id, title FROM posts WHERE title LIKE ?', `%${ilustra.procura}%`);
    if (!post) {
      console.log(`  · post não encontrado: ${ilustra.procura}`);
      continue;
    }

    const capa = baixadas.get(ilustra.capa);
    if (capa) {
      q.run('UPDATE posts SET cover = ?, cover_credit = ? WHERE id = ?', capa.url, capa.credito, post.id);
    }

    q.run('DELETE FROM post_images WHERE post_id = ?', post.id);
    let pos = 0;
    for (const item of ilustra.galeria) {
      const foto = baixadas.get(item.slug);
      if (!foto) continue;
      q.run(
        'INSERT INTO post_images (post_id, url, caption, credit, position) VALUES (?,?,?,?,?)',
        post.id,
        foto.url,
        item.caption,
        foto.credito,
        pos,
      );
      pos += 1;
    }
    console.log(`  ✓ ${post.title.slice(0, 46)}… — capa + ${pos} foto(s) na galeria`);
  }

  console.log('\nPronto. As fotos aparecem em Administrador → Imagens.\n');
}

main().catch((err) => {
  console.error('Falha ao baixar as fotos:', err.message);
  console.error('Sem internet? O site funciona normalmente; envie fotos próprias em /admin/midia.');
  process.exit(1);
});
