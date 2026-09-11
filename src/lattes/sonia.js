'use strict';

/**
 * Currículo Lattes de Sonia Bonduki
 * (ID 3738348980369937, atualizado em 25/04/2013), transcrito integralmente.
 */

const PERFIL = {
  slug: 'sonia-bonduki',
  name: 'Sonia Bonduki',
  short_name: 'Sonia Bonduki',
  role: 'Bióloga, professora de Ciências e autora de livros didáticos',
  tagline: 'Ensino de Ciências, Biologia Geral e História da Ciência',
  bio:
    'Possui licenciatura e bacharelado em Ciências Biológicas pela Universidade de Santo Amaro (1981). ' +
    'Atualmente é mestranda em História da Ciência na PUC-SP. Tem experiência na área educacional, ' +
    'com ênfase em Biologia Geral e ensino de Ciências Naturais para o Ensino Fundamental. ' +
    'Autora de livros didáticos de Ciências.',
  portrait: '/uploads/sonia-bonduki-retrato.jpg',
  initials: 'SB',
  accent: '#0f766e',
  lattes_id: '3738348980369937',
  lattes_url: 'http://lattes.cnpq.br/3738348980369937',
  lattes_updated: '25/04/2013',
  orcid_url: '',
  citation_names: 'BONDUKI, S.',
  nationality: 'Brasil',
  languages: [
    { lang: 'Inglês', detail: 'Compreende razoavelmente · Fala razoavelmente · Lê razoavelmente · Escreve razoavelmente' },
    { lang: 'Francês', detail: 'Compreende razoavelmente · Fala razoavelmente · Lê razoavelmente · Escreve razoavelmente' },
    { lang: 'Espanhol', detail: 'Compreende razoavelmente · Fala razoavelmente · Lê razoavelmente · Escreve pouco' },
  ],
  areas: ['Ciências Biológicas / Biologia Geral'],
  position: 2,
};

/* ----------------------------------------- formação e titulação -------- */

const FORMACAO = [
  {
    period: '2011 — Atual',
    sort_year: 2011,
    title: 'Mestrado em andamento em História da Ciência',
    org: 'Pontifícia Universidade Católica de São Paulo (PUC-SP)',
    description:
      'Título: “Zoonomia de Erasmus Darwin”. Orientadora: Silvia Waisse de Prive.',
    kind: 'formacao',
  },
  {
    period: '1976 — 1981',
    sort_year: 1976,
    title: 'Graduação em Licenciatura e Bacharelado em Ciências Biológicas',
    org: 'Universidade de Santo Amaro (UNISA)',
    description: '',
    kind: 'formacao',
  },
  {
    period: '2010',
    sort_year: 2010,
    title: 'Extensão universitária em História da Ciência e Experimentos em Sala de Aula (30 h)',
    org: 'Pontifícia Universidade Católica de São Paulo (PUC-SP)',
    description: 'Formação complementar.',
    kind: 'formacao',
  },
  {
    period: '2009',
    sort_year: 2009,
    title: 'Ocupação e Transformação do Centro Histórico de SP (9 h)',
    org: 'Escola Nova Lourenço Castanho',
    description: 'Formação complementar.',
    kind: 'formacao',
  },
  {
    period: '2003',
    sort_year: 2003,
    title: 'Teoria e Prática da Educação Ambiental na Escola (38 h)',
    org: 'Centro de Estudos Vera Cruz',
    description: 'Formação complementar.',
    kind: 'formacao',
  },
  {
    period: '1999',
    sort_year: 1999,
    title: 'Ciências Naturais: A Atividade Experimental (8 h)',
    org: 'Centro de Estudos da Escola da Vila',
    description: 'Formação complementar.',
    kind: 'formacao',
  },
  {
    period: '1997',
    sort_year: 1997,
    title: 'XXVI Curso de Recursos Paisagísticos (33 h)',
    org: 'Secretaria Municipal do Verde e do Meio Ambiente',
    description: 'Formação complementar.',
    kind: 'formacao',
  },
  {
    period: '1993',
    sort_year: 1993,
    title: '“A Importância do Aluno na Estruturação da Persona” (18 h)',
    org: 'Escola Nova Lourenço Castanho',
    description: 'Formação complementar.',
    kind: 'formacao',
  },
  {
    period: '1981',
    sort_year: 1981,
    title: 'Extensão universitária em Arqueologia Pré-Histórica Brasileira (35 h)',
    org: 'Museu Paulista — USP',
    description: 'Formação complementar.',
    kind: 'formacao',
  },
];

/* --------------------------------------------- atuação profissional ---- */

const TRAJETORIA = [
  {
    period: '1984 — 2011',
    sort_year: 1984,
    title: 'Professora de Ciências',
    org: 'Escola Nova Lourenço Castanho (ENLC)',
    description: 'Vínculo: empregada. Quase três décadas em sala de aula no Ensino Fundamental.',
    kind: 'carreira',
  },
  {
    period: '1998 — 2007',
    sort_year: 1998,
    title: 'Coordenação — Núcleo de Estudos Curriculares, Educação Básica',
    org: 'Escola Nova Lourenço Castanho (ENLC)',
    description: 'Coordenação do núcleo de estudos curriculares da educação básica.',
    kind: 'gestao',
  },
  {
    period: '1988 — 1990',
    sort_year: 1988,
    title: 'Professora de Ciências',
    org: 'Colégio Palmares',
    description: 'Vínculo: colaboradora.',
    kind: 'carreira',
  },
  {
    period: '1982',
    sort_year: 1982,
    title: 'Professora substituta — Servidora Pública',
    org: 'Escola Estadual Alberto Torres',
    description: '',
    kind: 'carreira',
  },
  {
    period: '1980 — 1982',
    sort_year: 1980,
    title: 'Iniciação Científica — Estágio',
    org: 'Instituto de Ciências Biomédicas — USP (ICB-USP)',
    description: '',
    kind: 'carreira',
  },
];

/* ------------------------------------------------------- publicações --- */

const PUBLICACOES = [
  {
    year: 2008,
    authors: 'BONDUKI, S.',
    title: 'Coleção Brasiliana — Ciências',
    venue: 'São Paulo: Companhia Editora Nacional',
    details: '1. ed., v. 4, 850 p.',
    kind: 'livro',
    highlight: 1,
  },
  {
    year: 2008,
    authors: 'BONDUKI, S.; CAMARGO, C. R.',
    title: 'Coleção Brasiliana — Natureza e Sociedade',
    venue: 'São Paulo: Companhia Editora Nacional',
    details: '1. ed., v. 1, 220 p.',
    kind: 'livro',
    highlight: 1,
  },
  {
    year: 2012,
    authors: 'BONDUKI, S.',
    title:
      'A Zoonomia de Erasmus Darwin: O olhar de seus contemporâneos e uma análise epistemológica',
    venue: 'Apresentação de Trabalho / Comunicação',
    details: '',
    kind: 'apresentacao',
  },
  {
    year: 2005,
    authors: 'ORME, Helen; RANDALL, Ronne; VAUGHAN, Jenny; BONDUKI, S.',
    title: 'Coleção Viver e Aprender',
    venue: 'Produção técnica — assessoria e consultoria',
    details: '',
    kind: 'tecnica',
  },
];

/* ------------------------------------------------------------ eventos -- */

const EVENTOS = [
  {
    year: 2011,
    title:
      'O Violino Vermelho: Uma Ferramenta Didática para a Compreensão do Objeto de Estudo na História da Ciência',
    org: 'Semana Acadêmica',
    kind: 'Encontro',
    role: 'Apresentação',
  },
  {
    year: 2011,
    title: 'III Jornada de História da Ciência e Ensino',
    org: '',
    kind: 'Organização de evento',
    role: 'Organizadora',
  },
  { year: 2010, title: 'III Simpósio Internacional Darwinismo Hoje', org: '', kind: 'Simpósio', role: 'Participação' },
  {
    year: 2009,
    title: '“A Importância da Natureza no Cotidiano dos Povos Indígenas da Amazônia”',
    org: '1º Congresso ICLOC',
    kind: 'Congresso',
    role: 'Apresentação',
  },
  {
    year: 2009,
    title:
      '“De Professor para Professor: Práticas de Sala de Aula de História, Geografia e Ciências”',
    org: 'Encontros com a Educação promovidos por IBEP-Nacional-Conrad',
    kind: 'Encontro',
    role: 'Apresentação',
  },
  { year: 2005, title: 'Encontros com Marion Woodman', org: '', kind: 'Encontro', role: 'Participação' },
  {
    year: 1998,
    title: 'XI Seminário Internacional — Concepções e Problemas no Ensino de Ciências Naturais',
    org: '',
    kind: 'Seminário',
    role: 'Participação',
  },
  {
    year: 1994,
    title:
      'Ciências: Observação e Registro — “Lendo e Escrevendo um Texto Informativo na 1ª série”',
    org: '4º Congresso de Educação para o Desenvolvimento',
    kind: 'Congresso',
    role: 'Apresentação',
  },
  {
    year: 1992,
    title: '“Como trabalhamos Ciências de 1ª à 4ª séries — Educação Básica”',
    org: '2º Congresso de Educação das Escolas do Grupo',
    kind: 'Congresso',
    role: 'Apresentação',
  },
  {
    year: 1992,
    title: '2º Congresso de Educação das Escolas do Grupo',
    org: '',
    kind: 'Congresso',
    role: 'Participação',
  },
];

/* --------------------------------- linhas de trabalho (para o site) ---- */

const LINHAS = [
  {
    title: 'Ensino de Ciências Naturais',
    icon: '🧑‍🏫',
    summary:
      'Quase três décadas de sala de aula no Ensino Fundamental, com ênfase em Biologia Geral e no ensino de Ciências Naturais. Coordenação do Núcleo de Estudos Curriculares da Educação Básica entre 1998 e 2007.',
    keywords: 'Ensino de Ciências; Educação Básica; Currículo',
    areas: 'Ciências Biológicas / Biologia Geral',
  },
  {
    title: 'Livros didáticos e materiais para a escola',
    icon: '📖',
    summary:
      'Autoria da Coleção Brasiliana — Ciências (Companhia Editora Nacional, 2008) e da Coleção Brasiliana — Natureza e Sociedade, além de assessoria e consultoria na Coleção Viver e Aprender.',
    keywords: 'Livro didático; Material escolar; Divulgação',
    areas: '',
  },
  {
    title: 'História da Ciência',
    icon: '📜',
    summary:
      'Pesquisa de mestrado na PUC-SP sobre a Zoonomia de Erasmus Darwin — o olhar de seus contemporâneos e uma análise epistemológica. Interesse pelo uso da História da Ciência como ferramenta didática em sala de aula.',
    keywords: 'História da Ciência; Erasmus Darwin; Epistemologia',
    areas: '',
  },
  {
    title: 'Educação ambiental e natureza',
    icon: '🌱',
    summary:
      'Formação e atuação em educação ambiental na escola, recursos paisagísticos e a relação entre natureza e cotidiano — incluindo trabalho sobre a importância da natureza no cotidiano dos povos indígenas da Amazônia.',
    keywords: 'Educação ambiental; Natureza; Amazônia',
    areas: '',
  },
];

module.exports = { PERFIL, FORMACAO, TRAJETORIA, PUBLICACOES, EVENTOS, LINHAS };
