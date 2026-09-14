'use strict';

/**
 * Carrega no banco o Currículo Lattes completo.
 *
 *   npm run lattes
 *
 * Substitui integralmente o conteúdo acadêmico (publicações, projetos,
 * trajetória, disciplinas, linhas de pesquisa, prêmios e orientações).
 * Não toca em posts, comentários, imagens nem ajustes do site.
 */

const { q, init, encerrar, setSetting } = require('./db');
const { ARTIGOS, LIVROS, CAPITULOS } = require('./lattes/publicacoes');
const { PROJETOS } = require('./lattes/projetos');
const {
  TRAJETORIA,
  GESTAO,
  FORMACAO,
  DISCIPLINAS,
  LINHAS,
  PREMIOS,
  EDITORIA,
  IDIOMAS,
  AREAS_ATUACAO,
  CITACOES,
} = require('./lattes/atuacao');
const { ORIENTACOES } = require('./lattes/orientacoes');

async function repovoar(tabela, linhas, colunas) {
  await q.run(`DELETE FROM ${tabela}`);
  const cols = colunas.join(', ');
  const marks = colunas.map(() => '?').join(', ');
  const sql = `INSERT INTO ${tabela} (${cols}) VALUES (${marks})`;
  for (const [i, linha] of linhas.entries()) {
    await q.run(sql, ...colunas.map((c) => (c === 'position' ? (linha.position ?? i) : linha[c] ?? null)));
  }
  console.log(`  · ${tabela}: ${linhas.length} registro(s)`);
}

async function main() {
  await init();
  console.log('\nCarregando o Currículo Lattes no site…\n');

  /* ------------------------------------------------------ publicações */
  const publicacoes = [
    ...ARTIGOS.map((p) => ({ kind: 'artigo', highlight: 0, citations: 0, ...p })),
    ...LIVROS.map((p) => ({ highlight: 0, citations: 0, ...p })),
    ...CAPITULOS.map((p) => ({ highlight: 0, citations: 0, ...p })),
  ];
  await repovoar('publications', publicacoes, [
    'year', 'authors', 'title', 'venue', 'details', 'doi', 'url',
    'citations', 'kind', 'highlight', 'position',
  ]);

  /* --------------------------------------------------------- projetos */
  const projetos = PROJETOS.map((p) => ({
    ...p,
    // guarda equipe, alunos e produção dentro da descrição estruturada
    description: [
      p.description,
      p.students ? `\n\n**Alunos envolvidos:** ${p.students}` : '',
      p.team ? `\n\n**Equipe:** ${p.team}` : '',
      p.output ? `\n\n**Produções associadas:** ${p.output}` : '',
    ].join(''),
  }));
  await repovoar('projects', projetos, [
    'title', 'period', 'role', 'funder', 'status', 'kind', 'description', 'position',
  ]);

  /* --------------------------------------- trajetória, gestão, formação */
  await repovoar('timeline', [...TRAJETORIA, ...GESTAO, ...FORMACAO], [
    'period', 'sort_year', 'title', 'org', 'description', 'kind',
  ]);

  /* ------------------------------------------------------ disciplinas */
  await repovoar('teaching', DISCIPLINAS, ['period', 'course', 'level', 'subjects', 'org', 'position']);

  /* ------------------------------------------------ linhas de pesquisa */
  const linhas = LINHAS.map((l) => ({
    ...l,
    summary: l.areas ? `${l.summary}\n\n**Áreas:** ${l.areas}` : l.summary,
  }));
  await repovoar('research_lines', linhas, ['title', 'summary', 'keywords', 'icon', 'position']);

  /* ---------------------------------------------------------- prêmios */
  await repovoar('awards', PREMIOS, ['year', 'title', 'org']);

  /* ------------------------------------------------------ orientações */
  await repovoar('mentorships', ORIENTACOES, [
    'year', 'student', 'title', 'kind', 'role', 'status', 'institution', 'funding',
  ]);

  /* ------------------------------- editoria, idiomas e áreas nos ajustes */
  await setSetting('lattes_id', '4923902785529755');
  await setSetting('lattes_url', 'http://lattes.cnpq.br/4923902785529755');
  await setSetting('orcid_url', 'https://orcid.org/0000-0002-1504-2647');
  await setSetting('lattes_updated', '24/02/2025');
  await setSetting('nationality', 'Brasil');
  await setSetting('citation_names', CITACOES.join(' · '));
  await setSetting('languages', JSON.stringify(IDIOMAS));
  await setSetting('areas_atuacao', JSON.stringify(AREAS_ATUACAO));
  await setSetting('editoria', JSON.stringify(EDITORIA));
  await setSetting(
    'bio_lattes',
    'Bacharelado em Ciências Biológicas pela Universidade de Santo Amaro (1980), Mestrado em Bioquímica e Imunologia pela Universidade Federal de Minas Gerais (1989), Doutorado em Imunologia pela Universidade de São Paulo (1993) e Pós-doutorado no Instituto Clodomiro Picado (Universidad de Costa Rica, 2009) e no Instituto Butantan (2011). Atualmente, é Professora Titular aposentada do Instituto de Ciências Biológicas da Universidade Federal do Amazonas. Durante o período de 2008 a 2012 foi Coordenadora do Programa de Imunologia Básica e Aplicada da Universidade Federal do Amazonas. Em pesquisa, possui experiência na área de Imunologia, com ênfase em Imunologia Aplicada e Imunoquímica, atuando principalmente nos seguintes temas: animais peçonhentos (serpentes, aranhas, escorpiões e arraias), validação de espécies vegetais com atividade antiofídica, antivenenos, Psiconeuroimunologia e Imunologia Comparada. Foi idealizadora e Coordenadora docente do Projeto de Extensão MEDensina de 2001 a 2022. Em 2012, a Revista Eletrônica Scientia Amazonia foi lançada e atua como uma das Editoras.',
  );

  const totais = {
    artigos: ARTIGOS.length,
    livros: LIVROS.length,
    capitulos: CAPITULOS.length,
    projetos: PROJETOS.length,
    orientacoes: ORIENTACOES.length,
    doutorados: ORIENTACOES.filter((o) => o.kind === 'doutorado').length,
    mestrados: ORIENTACOES.filter((o) => o.kind === 'mestrado').length,
    ic: ORIENTACOES.filter((o) => o.kind === 'iniciacao').length,
  };
  await setSetting('lattes_totais', JSON.stringify(totais));

  console.log('\nResumo do que foi carregado:');
  console.log(`  ${totais.artigos} artigos · ${totais.livros} livros · ${totais.capitulos} capítulos`);
  console.log(`  ${totais.projetos} projetos · ${DISCIPLINAS.length} registros de docência`);
  console.log(
    `  ${totais.orientacoes} orientações (${totais.doutorados} doutorados, ${totais.mestrados} mestrados, ${totais.ic} IC)`,
  );
  console.log('\nPronto. Recarregue o site para ver.\n');
}

main()
  .then(encerrar)
  .catch(async (err) => {
    console.error('\nFalhou:', err.message);
    await encerrar().catch(() => {});
    process.exit(1);
  });
