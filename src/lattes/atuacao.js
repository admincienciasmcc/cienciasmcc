'use strict';

/**
 * Atuação profissional, formação, disciplinas ministradas, comissões,
 * linhas de pesquisa, prêmios, idiomas e áreas de atuação — do Lattes.
 */

/* --------------------------------------------- trajetória e vínculos ---- */

const TRAJETORIA = [
  {
    period: '2021 — Atual',
    sort_year: 2021,
    title: 'Vínculo institucional',
    org: 'Universidade Federal de Uberlândia (UFU)',
    description: 'Vínculo institucional junto à instituição.',
    kind: 'carreira',
  },
  {
    period: '1997 — 2022',
    sort_year: 1997,
    title: 'Professora Titular — Servidora Pública, Dedicação Exclusiva',
    org: 'Universidade Federal do Amazonas (UFAM) — Instituto de Ciências Biológicas',
    description:
      'Portaria nº 0099/2013 — Gabinete da Reitora — autoriza a progressão horizontal do nível III para o IV, da Classe de Professora Associada V, em regime de Dedicação Exclusiva, a partir de 1º de maio de 2012. Em 10 de março de 2017 defendeu seu Memorial e foi aprovada para a Classe E de Titular — Portaria 0570/2017, Gabinete da Reitora.',
    kind: 'carreira',
  },
  {
    period: '1992 — 1997',
    sort_year: 1992,
    title: 'Professora Visitante — Adjunto IV, Dedicação Exclusiva',
    org: 'Universidade Federal do Amazonas (UFAM)',
    description: 'Vínculo de professora visitante em regime de dedicação exclusiva.',
    kind: 'carreira',
  },
  {
    period: '1988 — 1992',
    sort_year: 1988,
    title: 'Técnica de Nível Superior — Servidora pública/celetista',
    org: 'Universidade de São Paulo (USP)',
    description:
      'Atividades de pesquisa e desenvolvimento na linha de Imunologia Comparada (05/1988 a 09/1993).',
    kind: 'carreira',
  },
  {
    period: '1986 — 1988',
    sort_year: 1986,
    title: 'Pesquisadora Nível II — Servidora pública/celetista',
    org: 'Fundação Ezequiel Dias (FUNED)',
    description:
      'Pesquisa e desenvolvimento na linha Animais Peçonhentos: caracterização das atividades biológicas de peçonhas, acidentes, melhoria na produção de imunobiológicos e tratamentos com espécies vegetais (06/1986 a 05/1988).',
    kind: 'carreira',
  },
];

/* ------------------------------------------------- direção e gestão ---- */

const GESTAO = [
  {
    period: '03/2014 — Atual',
    sort_year: 2014,
    title: 'Membro da Comissão de avaliação dos projetos de PIBIC — Área da Saúde',
    org: 'UFAM — Pró-Reitoria de Pesquisa e Pós-Graduação',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '08/2008 — 02/2012',
    sort_year: 2008,
    title: 'Coordenadora do Programa de Pós-Graduação em Imunologia Básica e Aplicada',
    org: 'UFAM — Pró-Reitoria de Pesquisa e Pós-Graduação',
    description: 'Direção e administração do programa de pós-graduação.',
    kind: 'gestao',
  },
  {
    period: '07/2006 — 06/2011',
    sort_year: 2006,
    title: 'Membro da Câmara de Pesquisa e Pós-Graduação',
    org: 'UFAM — Conselho de Ensino e Pesquisa',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '08/2009 — 03/2011',
    sort_year: 2009,
    title: 'Membro do Comitê Gestor para Implantação do Sistema de Concessão de Passagens e Diárias',
    org: 'UFAM — Reitoria',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '01/2002 — 03/2011',
    sort_year: 2002,
    title: 'Membro de comissão permanente para julgar solicitação de passagens e diárias',
    org: 'UFAM — Pró-Reitoria de Pesquisa e Pós-Graduação',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '02/2009 — 03/2009',
    sort_year: 2009,
    title: 'Membro da Comissão: Proposta Institucional Edital 01/2008 — FINEP/CT-INFRA',
    org: 'UFAM — Portaria 0387/2009, Gabinete do Reitor',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '05/2006 — 12/2008',
    sort_year: 2006,
    title: 'Comissão do Meio Ambiente do Campus Universitário',
    org: 'UFAM — Reitoria',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '11/2004 — 08/2006',
    sort_year: 2004,
    title: 'Membro do Comitê Avaliador de Ciências Biológicas',
    org: 'UFAM — Pró-Reitoria para Extensão',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '04/2002 — 05/2003',
    sort_year: 2002,
    title: 'Membro de comissão para estruturação da Editora da Universidade do Amazonas (EDUA)',
    org: 'UFAM — Editora da Universidade Federal do Amazonas',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '04/2002 — 12/2002',
    sort_year: 2002,
    title: 'Membro de comissão temporária para estabelecer critérios para a destinação dos resíduos gerados na UFAM',
    org: 'UFAM — Pró-Reitoria para Ensino de Graduação',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '07/2001 — 12/2002',
    sort_year: 2001,
    title: 'Membro de comissão multi-institucional do IBAMA para Fauna',
    org: 'UFAM — Reitoria',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '07/2001 — 08/2002',
    sort_year: 2001,
    title: 'Membro de comissão permanente para Revalidação de diplomas de Pós-graduação',
    org: 'UFAM — Diretoria de Pós-Graduação',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '01/2002 — 04/2002',
    sort_year: 2002,
    title: 'Membro de comissão temporária para elaboração do projeto de Infraestrutura — Edital 03/2001 CT-INFRA',
    org: 'UFAM — Pró-Reitoria de Pesquisa e Pós-Graduação',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '10/2000 — 04/2002',
    sort_year: 2000,
    title: 'Chefe de Departamento',
    org: 'UFAM — Instituto de Ciências Biológicas',
    description: 'Direção e administração.',
    kind: 'gestao',
  },
  {
    period: '02/2001 — 03/2002',
    sort_year: 2001,
    title: 'Membro do Conselho Universitário — Representante eleita dos Professores da Categoria Adjunto',
    org: 'UFAM — Conselho Universitário',
    description: 'Conselhos, comissões e consultoria.',
    kind: 'gestao',
  },
  {
    period: '01/2002 — 02/2002',
    sort_year: 2002,
    title: 'Diretora do Instituto de Ciências Biológicas',
    org: 'UFAM — Instituto de Ciências Biológicas',
    description: 'Direção e administração.',
    kind: 'gestao',
  },
];

/* ---------------------------------------------------------- formação ---- */

const FORMACAO = [
  {
    period: '1990 — 1993',
    sort_year: 1990,
    title: 'Doutorado em Imunologia',
    org: 'Universidade de São Paulo (USP)',
    description:
      'Tese: “Caracterização bioquímica e das atividades biológicas dos venenos variedade amarela e branca de Crotalus durissus ruruima” (1993). Orientador: Wilmar Dias da Silva. Palavras-chave: atividades biológicas; veneno crotálico; soroneutralização; cascavel amazônica; variabilidade; Crotalus durissus ruruima.',
    kind: 'formacao',
  },
  {
    period: '1985 — 1989',
    sort_year: 1985,
    title: 'Mestrado em Bioquímica e Imunologia',
    org: 'Universidade Federal de Minas Gerais (UFMG)',
    description:
      'Dissertação: “Fosfolipase A2 isolada do veneno de Crotalus durissus terrificus induz proteção contra os efeitos letal (camundongos e equídeos) e miolítico (camundongos) causados pela ação do veneno total” (1989). Orientador: Carlos Ribeiro Diniz. Bolsista CAPES. Palavras-chave: fosfolipase A2; veneno crotálico; neutralização; vacina; atividade miotóxica.',
    kind: 'formacao',
  },
  {
    period: '1982 — 1984',
    sort_year: 1982,
    title: 'Especialização em Química e Farmacologia de Produtos Naturais',
    org: 'Universidade Federal da Paraíba (UFPB)',
    description: '',
    kind: 'formacao',
  },
  {
    period: '1980 — 1981',
    sort_year: 1980,
    title: 'Especialização em Artrópodes Peçonhentos (750 h)',
    org: 'Instituto Butantan',
    description: '',
    kind: 'formacao',
  },
  {
    period: '1976 — 1980',
    sort_year: 1976,
    title: 'Graduação em Ciências Biológicas',
    org: 'Universidade de Santo Amaro (UNISA)',
    description: '',
    kind: 'formacao',
  },
  {
    period: '2011',
    sort_year: 2011,
    title: 'Pós-Doutorado',
    org: 'Instituto Butantan (IBU)',
    description: 'Grande área: Ciências Biológicas.',
    kind: 'formacao',
  },
  {
    period: '2009',
    sort_year: 2009,
    title: 'Pós-Doutorado',
    org: 'Universidad de Costa Rica (UCR) — Instituto Clodomiro Picado',
    description:
      'Grande área: Ciências Biológicas. Áreas: Imunologia/Imunoquímica e Farmacologia/Toxicologia — Animais Peçonhentos.',
    kind: 'formacao',
  },
  {
    period: '2015',
    sort_year: 2015,
    title: 'Uso Estratégico de Patentes em Negócios (12 h)',
    org: 'Universidade Federal do Amazonas (UFAM)',
    description: 'Formação complementar.',
    kind: 'formacao',
  },
];

/* ------------------------------------------ disciplinas ministradas ---- */

const DISCIPLINAS = [
  {
    period: '09/2020 — Atual',
    course: 'Medicina',
    level: 'Graduação',
    subjects: 'Imunologia Médica — Ensino Remoto Emergencial',
  },
  {
    period: '08/2017 — Atual',
    course: 'Imunologia Básica e Aplicada',
    level: 'Pós-Graduação',
    subjects: 'Psiconeuroimunologia',
  },
  {
    period: '01/2014 — Atual',
    course: 'Residência Multiprofissional',
    level: 'Especialização',
    subjects: 'Psiconeuroimunologia',
  },
  {
    period: '02/2013 — Atual',
    course: 'Ciência Animal e Recursos Pesqueiros',
    level: 'Pós-Graduação',
    subjects: 'Seminário de integração II — Oficina de Redação Científica',
  },
  {
    period: '08/2004 — Atual',
    course: 'Ciências Biológicas',
    level: 'Graduação',
    subjects: 'Imunologia para Ciências Biológicas',
  },
  {
    period: '02/2002 — Atual',
    course: 'Biotecnologia',
    level: 'Pós-Graduação',
    subjects: 'Imunologia Avançada',
  },
  {
    period: '04/1997 — Atual',
    course: 'Medicina',
    level: 'Graduação',
    subjects: 'Imunologia Médica · Microbiologia e Imunologia · Psiconeuroimunologia',
  },
  {
    period: '04/1997 — Atual',
    course: 'Enfermagem',
    level: 'Graduação',
    subjects: 'Imunologia',
  },
  {
    period: '04/1997 — Atual',
    course: 'Ciências',
    level: 'Graduação',
    subjects: 'Imunologia para o Ensino Fundamental',
  },
  {
    period: '04/1997 — Atual',
    course: 'Odontologia',
    level: 'Graduação',
    subjects: 'Imunologia Básica · Microbiologia e Imunologia',
  },
  {
    period: '11/2019 — 12/2019',
    course: 'Imunologia Básica e Aplicada',
    level: 'Pós-Graduação',
    subjects: 'Venenos e antivenenos',
  },
  {
    period: '03/2009 — 02/2012',
    course: 'Imunologia Básica e Aplicada',
    level: 'Pós-Graduação',
    subjects: 'Atualização em Imunologia',
  },
  {
    period: '04/1997 — 12/2009',
    course: 'Farmácia',
    level: 'Graduação',
    subjects: 'Imunologia Básica',
  },
  {
    period: '06/2002 — 03/2009',
    course: 'Patologia Tropical',
    level: 'Pós-Graduação (Mestrado)',
    subjects: 'Imunologia Avançada',
  },
  {
    period: '02/1992 — 04/1997',
    course: 'Medicina',
    level: 'Graduação',
    subjects: 'Bioquímica',
  },
  {
    period: '02/1992 — 02/1993',
    course: 'Ciências Biológicas',
    level: 'Graduação',
    subjects: 'Zoologia',
  },
];

/* --------------------------------------------- linhas de pesquisa ------ */

const LINHAS = [
  {
    title: 'Animais Peçonhentos',
    icon: '🐍',
    summary:
      'Caracterização das atividades biológicas de peçonhas, acidentes, melhoria na produção de imunobiológicos e tratamentos com espécies vegetais. Objetivo: caracterizar as atividades biológicas dos venenos, principalmente de serpentes, e verificar o poder neutralizante dos soros frente a essas atividades. Buscar na cultura popular as espécies vegetais utilizadas como antiofídicas.',
    keywords: 'Neutralização; Antiveneno; Espécies vegetais',
    areas:
      'Ciências Biológicas / Farmacologia / Toxicologia · Ciências Biológicas / Imunologia / Imunoquímica. Setores: Agricultura, Pecuária, Produção Florestal, Pesca e Aquicultura.',
  },
  {
    title: 'Animais aquáticos causadores de acidentes (envenenamento) da Região Amazônica',
    icon: '🌊',
    summary:
      'Estudar as lesões dermatológicas induzidas por contato com esponjas de água doce. Estudar a composição dos venenos de arraias e seus efeitos biológicos.',
    keywords: 'Cauixi; Arraias',
    areas: 'Ciências Biológicas',
  },
  {
    title: 'Imunologia Comparada',
    icon: '🐟',
    summary: 'Isolar e identificar componentes imunes de peixes e arraias da Amazônia.',
    keywords: 'Peixes; Purificação de Imunoglobulinas; Amazônia',
    areas:
      'Ciências Biológicas / Farmacologia / Toxicologia · Ciências Biológicas / Farmacologia / Etnofarmacologia. Setores: Atividades de atenção à saúde humana.',
  },
  {
    title: 'Imunodiagnóstico por saliva',
    icon: '🧪',
    summary:
      'Averiguar, na saliva, as alterações nos títulos de imunoglobulinas, nas concentrações de proteínas e no fluxo salivar em indivíduos com ou sem patologias bucais. Quantificar citocinas e fenotipar células presentes na saliva.',
    keywords: 'Resposta Imune; saliva',
    areas:
      'Ciências Biológicas / Imunologia / Imunoquímica · Ciências Humanas / Psicologia / Psicologia Social. Setores: Saúde humana e serviços sociais; Atividades de atenção à saúde humana.',
  },
  {
    title: 'Doenças autoimunes',
    icon: '🔬',
    summary:
      'Estudo genético de pacientes com doenças autoimunes como LES e Artrite Reumatóide. Desenvolvimento de nanossensores para diagnóstico de doenças autoimunes. Verificar a eficácia de espécies vegetais utilizadas popularmente no tratamento de doenças autoimunes.',
    keywords: 'Lúpus Eritematoso Sistêmico; Artrite reumatóide; Autoimunidade',
    areas:
      'Ciências Biológicas · Ciências da Saúde / Medicina / Clínica Médica / Reumatologia. Setores: Saúde humana e serviços sociais.',
  },
  {
    title: 'Implantação da Coleta Seletiva de Resíduos Sólidos no Amazonas',
    icon: '♻️',
    summary:
      'Implantar a coleta seletiva nas diferentes unidades da Universidade Federal do Amazonas.',
    keywords: 'Resíduos sólidos; reciclagem',
    areas: '',
  },
];

/* ------------------------------------------------------------ prêmios -- */

const PREMIOS = [
  {
    year: 2019,
    title:
      'Orientação da melhor TESE de 2018, intitulada “Produção de soro hiperimune para Potamotrygon motoro Müller & Henle, 1841…”',
    org: 'Pró-Reitoria de Pesquisa e Pós-Graduação — UFAM',
  },
  {
    year: 2014,
    title:
      'Menção Honrosa com o trabalho “Plantas medicinais utilizadas no tratamento de acidentes ofídicos pela população da Região Oeste do Pará, Santarém, Brasil”',
    org: 'XXIII Simpósio de Plantas Medicinais do Brasil',
  },
  {
    year: 2010,
    title: 'Professor Destaque 2009',
    org: 'Diretório Acadêmico de Medicina Humberto Mendonça — UFAM',
  },
];

/* ------------------------------------- editoria, revisão e idiomas ----- */

const EDITORIA = {
  corpoEditorial: [{ period: '2012 — Atual', name: 'Scientia Amazonia' }],
  revisorPeriodico: [
    { period: '2021 — Atual', name: 'Revista da Sociedade Brasileira de Medicina Tropical' },
    { period: '2014', name: 'Revista Brasileira de Plantas Medicinais (Impresso)' },
    { period: '2013', name: 'Journal of Medicinal Plant Research' },
    { period: '2006 — Atual', name: 'Revista Brasileira de Zoologia' },
    { period: '2002 — Atual', name: 'Acta Amazonica' },
  ],
  revisorFomento: [
    {
      period: '2016',
      name: 'Fundação Rondônia de Amparo ao Desenvolvimento das Ações Científicas e Tecnológicas',
    },
    { period: '2013', name: 'Fundação de Amparo à Pesquisa do Estado de Minas Gerais' },
    { period: '2011 — Atual', name: 'Conselho Nacional de Desenvolvimento Científico e Tecnológico' },
    { period: '1995 — 1999', name: 'Conselho Nacional de Desenvolvimento Científico e Tecnológico' },
  ],
};

const IDIOMAS = [
  { lang: 'Inglês', detail: 'Compreende razoavelmente · Fala pouco · Lê bem · Escreve bem' },
  { lang: 'Espanhol', detail: 'Compreende bem · Fala razoavelmente · Lê bem · Escreve razoavelmente' },
  { lang: 'Italiano', detail: 'Compreende bem · Fala pouco · Lê bem · Escreve pouco' },
  { lang: 'Francês', detail: 'Compreende razoavelmente · Fala pouco · Lê bem · Escreve pouco' },
];

const AREAS_ATUACAO = [
  'Ciências Biológicas / Imunologia / Imunologia Aplicada',
  'Ciências Biológicas / Farmacologia / Toxicologia',
  'Ciências Biológicas / Imunologia',
  'Ciências Biológicas / Farmacologia / Etnofarmacologia',
  'Ciências Biológicas / Imunologia / Psiconeuroimunologia',
];

const CITACOES = [
  'DOS-SANTOS, M. C.',
  'Dos-Santos, Maria Cristina',
  'Dos Santos, M Cristina',
  'Dos Santos, M. Cristina',
  'Santos, Maria Cristina dos',
  'Dos-Santos, María Cristina',
  'Dos Santos, Maria Cristina',
  'Dos-Santos, M.',
  'Santos, Cristina dos',
  'SANTOS, MARIA CRISTINA DOS-',
];

module.exports = {
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
};
