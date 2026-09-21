'use strict';

/**
 * Estabelece as duas idealizadoras do projeto e distribui o conteúdo entre elas.
 *
 *   npm run pessoas
 *
 * Cria os perfis de Maria Cristina e Sonia, atribui a Maria Cristina todo o
 * currículo já carregado, e insere o currículo da Sonia. Não toca em posts,
 * comentários nem imagens — apenas marca a autoria dos posts existentes.
 */

const { q, init, encerrar, setSetting } = require('./db');
const sonia = require('./lattes/sonia');

/* --------------------------------------------------------- perfis ----- */

const MARIA = {
  slug: 'maria-cristina-dos-santos',
  name: 'Maria Cristina dos Santos Sobreira de Sampaio',
  short_name: 'Maria Cristina dos Santos Sobreira de Sampaio',
  role: 'Professora Titular (aposentada) — Instituto de Ciências Biológicas / UFAM',
  tagline: 'Imunologia, animais peçonhentos e ciência da Amazônia',
  bio:
    'Bacharelado em Ciências Biológicas pela Universidade de Santo Amaro (1980), Mestrado em ' +
    'Bioquímica e Imunologia pela Universidade Federal de Minas Gerais (1989), Doutorado em ' +
    'Imunologia pela Universidade de São Paulo (1993) e Pós-doutorado no Instituto Clodomiro ' +
    'Picado (Universidad de Costa Rica, 2009) e no Instituto Butantan (2011). Atualmente, é ' +
    'Professora Titular aposentada do Instituto de Ciências Biológicas da Universidade Federal ' +
    'do Amazonas. Durante o período de 2008 a 2012 foi Coordenadora do Programa de Imunologia ' +
    'Básica e Aplicada da UFAM. Em pesquisa, possui experiência na área de Imunologia, com ' +
    'ênfase em Imunologia Aplicada e Imunoquímica, atuando principalmente nos seguintes temas: ' +
    'animais peçonhentos (serpentes, aranhas, escorpiões e arraias), validação de espécies ' +
    'vegetais com atividade antiofídica, antivenenos, Psiconeuroimunologia e Imunologia ' +
    'Comparada. Foi idealizadora e Coordenadora docente do Projeto de Extensão MEDensina de ' +
    '2001 a 2022. Em 2012, a Revista Eletrônica Scientia Amazonia foi lançada e atua como uma ' +
    'das Editoras.',
  portrait: '/uploads/maria-cristina-retrato.jpg',
  initials: 'MC',
  accent: '#14532d',
  lattes_id: '4923902785529755',
  lattes_url: 'http://lattes.cnpq.br/4923902785529755',
  lattes_updated: '24/02/2025',
  orcid_url: 'https://orcid.org/0000-0002-1504-2647',
  citation_names:
    'DOS-SANTOS, M. C. · Dos-Santos, Maria Cristina · Dos Santos, M Cristina · Dos Santos, M. Cristina · ' +
    'Santos, Maria Cristina dos · Dos-Santos, María Cristina · Dos Santos, Maria Cristina · ' +
    'Dos-Santos, M. · Santos, Cristina dos · SANTOS, MARIA CRISTINA DOS-',
  languages: JSON.stringify([
    { lang: 'Inglês', detail: 'Compreende razoavelmente · Fala pouco · Lê bem · Escreve bem' },
    { lang: 'Espanhol', detail: 'Compreende bem · Fala razoavelmente · Lê bem · Escreve razoavelmente' },
    { lang: 'Italiano', detail: 'Compreende bem · Fala pouco · Lê bem · Escreve pouco' },
    { lang: 'Francês', detail: 'Compreende razoavelmente · Fala pouco · Lê bem · Escreve pouco' },
  ]),
  areas: JSON.stringify([
    'Ciências Biológicas / Imunologia / Imunologia Aplicada',
    'Ciências Biológicas / Farmacologia / Toxicologia',
    'Ciências Biológicas / Imunologia',
    'Ciências Biológicas / Farmacologia / Etnofarmacologia',
    'Ciências Biológicas / Imunologia / Psiconeuroimunologia',
  ]),
  nationality: 'Brasil',
  position: 1,
};

const SONIA = {
  ...sonia.PERFIL,
  languages: JSON.stringify(sonia.PERFIL.languages),
  areas: JSON.stringify(sonia.PERFIL.areas),
};

const COLUNAS_PESSOA = [
  'slug', 'name', 'short_name', 'role', 'tagline', 'bio', 'portrait', 'initials',
  'accent', 'lattes_id', 'lattes_url', 'lattes_updated', 'orcid_url', 'linkedin_url',
  'citation_names', 'languages', 'areas', 'nationality', 'position',
];

async function gravarPessoa(dados) {
  const existente = await q.get('SELECT id FROM people WHERE slug = ?', dados.slug);
  const valores = COLUNAS_PESSOA.map((c) => dados[c] ?? '');
  if (existente) {
    const sets = COLUNAS_PESSOA.map((c) => `${c} = ?`).join(', ');
    await q.run(`UPDATE people SET ${sets} WHERE id = ?`, ...valores, existente.id);
    return existente.id;
  }
  const marks = COLUNAS_PESSOA.map(() => '?').join(', ');
  const info = await q.run(
    `INSERT INTO people (${COLUNAS_PESSOA.join(', ')}) VALUES (${marks})`,
    ...valores,
  );
  return Number(info.lastInsertRowid);
}

/* ------------------------------------------------------------ execução  */

async function main() {
  await init();
  console.log('\nConfigurando as duas idealizadoras do projeto…\n');

  const idMaria = await gravarPessoa(MARIA);
  const idSonia = await gravarPessoa(SONIA);
  console.log(`  · Maria Cristina dos Santos Sobreira de Sampaio (id ${idMaria})`);
  console.log(`  · Sonia Bonduki (id ${idSonia})\n`);

  /* Todo o currículo já carregado é da Maria Cristina. */
  const TABELAS = [
    'publications', 'projects', 'timeline', 'teaching',
    'mentorships', 'research_lines', 'awards', 'posts',
  ];
  for (const t of TABELAS) {
    const r = await q.run(`UPDATE ${t} SET person_id = ? WHERE person_id IS NULL`, idMaria);
    if (r.changes) console.log(`  · ${t}: ${r.changes} registro(s) atribuídos a Maria Cristina`);
  }

  /* Currículo da Sonia — sempre regravado do zero. */
  console.log('');
  await q.run('DELETE FROM timeline       WHERE person_id = ?', idSonia);
  await q.run('DELETE FROM publications   WHERE person_id = ?', idSonia);
  await q.run('DELETE FROM research_lines WHERE person_id = ?', idSonia);
  await q.run('DELETE FROM projects       WHERE person_id = ?', idSonia);

  const SQL_TIMELINE = `INSERT INTO timeline (period, sort_year, title, org, description, kind, person_id)
     VALUES (?,?,?,?,?,?,?)`;
  for (const t of [...sonia.TRAJETORIA, ...sonia.FORMACAO]) {
    await q.run(SQL_TIMELINE, t.period, t.sort_year, t.title, t.org, t.description, t.kind, idSonia);
  }
  console.log(`  · trajetória e formação da Sonia: ${sonia.TRAJETORIA.length + sonia.FORMACAO.length}`);

  const SQL_PUB = `INSERT INTO publications (year, authors, title, venue, details, citations, kind, highlight, position, person_id)
     VALUES (?,?,?,?,?,?,?,?,?,?)`;
  for (const [i, p] of sonia.PUBLICACOES.entries()) {
    await q.run(SQL_PUB, p.year, p.authors, p.title, p.venue, p.details, 0, p.kind, p.highlight ?? 0, i, idSonia);
  }
  console.log(`  · publicações da Sonia: ${sonia.PUBLICACOES.length}`);

  const SQL_LINHA = `INSERT INTO research_lines (title, summary, keywords, icon, position, person_id)
     VALUES (?,?,?,?,?,?)`;
  for (const [i, l] of sonia.LINHAS.entries()) {
    const resumo = l.areas ? `${l.summary}\n\n**Áreas:** ${l.areas}` : l.summary;
    await q.run(SQL_LINHA, l.title, resumo, l.keywords, l.icon, i, idSonia);
  }
  console.log(`  · linhas de trabalho da Sonia: ${sonia.LINHAS.length}`);

  /* Os eventos viram "projetos" do tipo evento, para aparecerem na página dela. */
  const SQL_PROJ = `INSERT INTO projects (title, period, role, funder, status, kind, description, position, person_id)
     VALUES (?,?,?,?,?,?,?,?,?)`;
  for (const [i, e] of sonia.EVENTOS.entries()) {
    await q.run(SQL_PROJ, e.title, String(e.year), e.role, '', e.kind, 'evento', e.org || '', i, idSonia);
  }
  console.log(`  · eventos e congressos da Sonia: ${sonia.EVENTOS.length}`);

  /* --------------------------------------------- identidade do site --- */
  await setSetting('site_title', 'Sob a luz da ciência');
  await setSetting('site_tagline', 'Maria Cristina dos Santos Sobreira de Sampaio e Sonia Bonduki');
  await setSetting(
    'site_description',
    'Sob a luz da ciência é um projeto de divulgação científica ' +
      'de Maria Cristina dos Santos Sobreira de Sampaio e Sonia Bonduki, duas biólogas. Imunologia, animais ' +
      'peçonhentos, Amazônia e ensino de Ciências — separando o que é mito, o que é ' +
      'curiosidade e o que é conceito.',
  );
  await setSetting('owner_name', 'Maria Cristina dos Santos Sobreira de Sampaio e Sonia Bonduki');
  await setSetting('owner_short', 'Maria Cristina dos Santos Sobreira de Sampaio e Sonia Bonduki');
  await setSetting('projeto_duplo', '1');

  console.log('\nPronto. As duas estão no site.\n');
}

main()
  .then(encerrar)
  .catch(async (err) => {
    console.error('\nFalhou:', err.message);
    await encerrar().catch(() => {});
    process.exit(1);
  });
