'use strict';

/* =========================================================================
   Denise Mirás — jornalista, idealizadora do projeto junto com
   Maria Cristina e Sonia.

   Ela não tem currículo Lattes: a trajetória vem do próprio relato dela,
   e por isso aqui só está registrado o que é verificável no texto que nos
   passou — veículos, áreas e formação, sem datas inventadas.
   ========================================================================= */

const PERFIL = {
  slug: 'denise-miras',
  name: 'Denise Mirás',
  short_name: 'Denise Mirás',
  role: 'Jornalista — Comunicação Social pela FAAP',
  tagline: 'Jornalismo impresso, digital e assessoria de imprensa',
  bio:
    'Formada em Comunicação Social pela FAAP, com experiência em jornalismo impresso '
    + '(Jornal da Tarde/Estadão e Revista da Cultura, piauí, IstoÉ), em sites '
    + '(R7, UOL, Yahoo) e em assessoria de imprensa (Ministério do Esporte). '
    + 'Especialista em Esporte, com trabalhos nas áreas mais diversas, de Ciência e '
    + 'Tecnologia a Moda e Internacional.',
  portrait: '/uploads/denise-miras-retrato.jpg',
  initials: 'DM',
  accent: '#b45309',
  lattes_id: '',
  lattes_url: '',
  lattes_updated: '',
  orcid_url: '',
  linkedin_url: '',
  citation_names: 'MIRÁS, D.',
  nationality: 'Brasil',
  languages: [],
  areas: [
    'Comunicação Social / Jornalismo',
    'Jornalismo esportivo',
    'Jornalismo de Ciência e Tecnologia',
  ],
  position: 3,
};

/* ----------------------------------------------- no que ela trabalha --- */

const LINHAS = [
  {
    title: 'Jornalismo impresso',
    summary:
      'Redação e edição em jornal e revista: Jornal da Tarde e Estadão, Revista da '
      + 'Cultura, piauí e IstoÉ.',
    keywords: 'jornal, revista, reportagem, edição',
    icon: '📰',
  },
  {
    title: 'Jornalismo digital',
    summary: 'Produção para portais de grande audiência: R7, UOL e Yahoo.',
    keywords: 'portais, internet, audiência',
    icon: '💻',
  },
  {
    title: 'Assessoria de imprensa',
    summary:
      'Comunicação institucional e relação com a imprensa, com passagem pelo '
      + 'Ministério do Esporte.',
    keywords: 'assessoria, comunicação institucional, imprensa',
    icon: '🗞️',
  },
  {
    title: 'Da especialidade ao campo aberto',
    summary:
      'Especialista em Esporte, com trabalhos nas áreas mais diversas — de Ciência e '
      + 'Tecnologia a Moda e Internacional. É essa travessia entre assuntos que ela '
      + 'traz para o projeto: transformar o que a pesquisa produz em texto que se lê.',
    keywords: 'esporte, ciência e tecnologia, moda, internacional, divulgação',
    icon: '🔎',
  },
];

module.exports = { PERFIL, LINHAS };
