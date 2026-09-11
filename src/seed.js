'use strict';

/**
 * Popula o banco com o conteúdo institucional (currículo Lattes),
 * as categorias do blog e alguns posts de exemplo.
 *
 *   npm run seed     → cria o que ainda não existe
 *   npm run reset    → apaga tudo e recria (perde posts e comentários!)
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { q, db, setSetting, getSettings, reindexPost, DATA_DIR } = require('./db');
const { hashPassword } = require('./auth');
const { slugify, summarize, readingStats } = require('./intel');
const { renderMarkdown } = require('./markdown');

const RESET = process.argv.includes('--reset');

/* ------------------------------------------------------------- currículo */

const TIMELINE = [
  {
    period: '2021 — atual',
    sort_year: 2021,
    title: 'Colaboração institucional',
    org: 'Universidade Federal de Uberlândia (UFU)',
    description: 'Vínculo institucional em atividades de pesquisa e pós-graduação.',
    kind: 'carreira',
  },
  {
    period: '1997 — 2022',
    sort_year: 1997,
    title: 'Professora Titular (Classe E)',
    org: 'Instituto de Ciências Biológicas — UFAM',
    description:
      'Servidora pública em regime de dedicação exclusiva. Aprovada para a Classe E de Titular em março de 2017, após defesa de memorial (Portaria 0570/2017).',
    kind: 'carreira',
  },
  {
    period: '2008 — 2012',
    sort_year: 2008,
    title: 'Coordenadora do Programa de Pós-Graduação em Imunologia Básica e Aplicada',
    org: 'UFAM',
    description: 'Direção acadêmica do programa junto à Pró-Reitoria de Pesquisa e Pós-Graduação.',
    kind: 'gestao',
  },
  {
    period: '2002',
    sort_year: 2002,
    title: 'Diretora do Instituto de Ciências Biológicas',
    org: 'UFAM',
    description: 'Antes disso, Chefe de Departamento entre 2000 e 2002.',
    kind: 'gestao',
  },
  {
    period: '2001 — 2002',
    sort_year: 2001,
    title: 'Membro do Conselho Universitário',
    org: 'UFAM',
    description: 'Representante eleita dos professores da categoria Adjunto.',
    kind: 'gestao',
  },
  {
    period: '1992 — 1997',
    sort_year: 1992,
    title: 'Professora Visitante (Adjunto IV)',
    org: 'UFAM',
    description: 'Dedicação exclusiva; ensino de Bioquímica e Zoologia na graduação.',
    kind: 'carreira',
  },
  {
    period: '1988 — 1992',
    sort_year: 1988,
    title: 'Técnica de Nível Superior — pesquisa em Imunologia Comparada',
    org: 'Universidade de São Paulo (USP)',
    description: 'Atividades de pesquisa e desenvolvimento no período do doutorado.',
    kind: 'carreira',
  },
  {
    period: '1986 — 1988',
    sort_year: 1986,
    title: 'Pesquisadora Nível II',
    org: 'Fundação Ezequiel Dias (FUNED)',
    description:
      'Animais peçonhentos: caracterização de peçonhas, melhoria na produção de imunobiológicos e tratamentos com espécies vegetais.',
    kind: 'carreira',
  },
];

const FORMACAO = [
  {
    period: '2011',
    sort_year: 2011,
    title: 'Pós-doutorado',
    org: 'Instituto Butantan',
    description: 'Ciências Biológicas.',
    kind: 'formacao',
  },
  {
    period: '2009',
    sort_year: 2009,
    title: 'Pós-doutorado',
    org: 'Instituto Clodomiro Picado — Universidad de Costa Rica',
    description: 'Imunoquímica e toxicologia de animais peçonhentos.',
    kind: 'formacao',
  },
  {
    period: '1990 — 1993',
    sort_year: 1990,
    title: 'Doutorado em Imunologia',
    org: 'Universidade de São Paulo (USP)',
    description:
      'Tese: “Caracterização bioquímica e das atividades biológicas dos venenos variedade amarela e branca de Crotalus durissus ruruima”. Orientador: Wilmar Dias da Silva.',
    kind: 'formacao',
  },
  {
    period: '1985 — 1989',
    sort_year: 1985,
    title: 'Mestrado em Bioquímica e Imunologia',
    org: 'Universidade Federal de Minas Gerais (UFMG)',
    description:
      'Dissertação: “Fosfolipase A2 isolada do veneno de Crotalus durissus terrificus induz proteção contra os efeitos letal e miolítico causados pelo veneno total”. Orientador: Carlos Ribeiro Diniz. Bolsista CAPES.',
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
    title: 'Especialização em Artrópodes Peçonhentos',
    org: 'Instituto Butantan',
    description: 'Carga horária de 750 horas.',
    kind: 'formacao',
  },
  {
    period: '1976 — 1980',
    sort_year: 1976,
    title: 'Bacharelado em Ciências Biológicas',
    org: 'Universidade de Santo Amaro (UNISA)',
    description: '',
    kind: 'formacao',
  },
];

const RESEARCH_LINES = [
  {
    title: 'Animais peçonhentos, peçonhas e antivenenos',
    summary:
      'Caracterização das atividades biológicas dos venenos — sobretudo de serpentes — e verificação do poder neutralizante dos soros frente a essas atividades. Inclui a busca, na cultura popular, de espécies vegetais usadas como antiofídicas.',
    keywords: 'Neutralização; Antiveneno; Espécies vegetais',
    icon: '🐍',
  },
  {
    title: 'Animais aquáticos causadores de acidentes na Amazônia',
    summary:
      'Estudo das lesões dermatológicas induzidas pelo contato com esponjas de água doce (cauixi) e da composição dos venenos de arraias e seus efeitos biológicos.',
    keywords: 'Cauixi; Arraias',
    icon: '🌊',
  },
  {
    title: 'Imunologia comparada',
    summary:
      'Isolamento e identificação de componentes imunes de peixes e arraias da Amazônia, incluindo a purificação de imunoglobulinas de tambaqui, pirarucu e arraias.',
    keywords: 'Peixes; Purificação de imunoglobulinas; Amazônia',
    icon: '🐟',
  },
  {
    title: 'Psiconeuroimunologia',
    summary:
      'Integração entre os sistemas nervoso, endócrino, imune e a microbiota intestinal. Estudo do estresse psicológico em estudantes de Medicina e médicos residentes e seus marcadores imunológicos salivares.',
    keywords: 'Estresse; Resposta imune; Saliva',
    icon: '🧠',
  },
  {
    title: 'Doenças autoimunes',
    summary:
      'Estudo genético de pacientes com lúpus eritematoso sistêmico e artrite reumatoide, desenvolvimento de nanossensores para diagnóstico e avaliação de espécies vegetais usadas popularmente no tratamento.',
    keywords: 'Lúpus; Artrite reumatoide; Autoimunidade',
    icon: '🔬',
  },
  {
    title: 'Imunodiagnóstico por saliva',
    summary:
      'Alterações nos títulos de imunoglobulinas, nas concentrações de proteínas e no fluxo salivar em indivíduos com ou sem patologias bucais; quantificação de citocinas e fenotipagem celular.',
    keywords: 'Resposta imune; Saliva',
    icon: '🧪',
  },
];

const PROJECTS = [
  {
    title:
      'Elaboração de fitoterápico para tratamento das ações locais induzidas em acidentes por Bothrops atrox',
    period: '2017 — atual',
    role: 'Coordenadora',
    funder: 'FAPEAM',
    status: 'Em andamento',
    kind: 'pesquisa',
    description:
      'Bellucia dichotoma demonstrou potencial para bloquear os efeitos locais do veneno botrópico que o antibotrópico não neutraliza com eficácia. O projeto desenvolve uma forma farmacêutica anti-inflamatória e antimicrobiana a partir da planta, como tratamento complementar à soroterapia.',
  },
  {
    title: 'Purificação de imunoglobulinas de peixes e arraias amazônicas',
    period: '2012 — atual',
    role: 'Coordenadora',
    funder: '',
    status: 'Em andamento',
    kind: 'pesquisa',
    description:
      'Comparação de três métodos de obtenção de imunoglobulinas (ácido caprílico, proteína A e proteína G) em arraia (Plesiotrygon iwamae), tambaqui (Colossoma macropomum) e pirarucu (Arapaima gigas), espécies sem estudos imunológicos anteriores.',
  },
  {
    title:
      'Perfil proteico e atividades biológicas dos venenos das arraias da Bacia Amazônica',
    period: '2011 — atual',
    role: 'Coordenadora',
    funder: 'CNPq',
    status: 'Em andamento',
    kind: 'pesquisa',
    description:
      'Caracterização da ação inflamatória local induzida pelos venenos de Plesiotrygon iwamae, Paratrygon aiereba e espécies do gênero Potamotrygon. Não existe antídoto específico para o veneno das arraias de água doce, e os acidentes atingem sobretudo populações ribeirinhas distantes de atendimento médico.',
  },
  {
    title: 'Inflamação induzida pelo veneno de Bothrops atrox',
    period: '2011 — atual',
    role: 'Coordenadora',
    funder: '',
    status: 'Em andamento',
    kind: 'pesquisa',
    description:
      'Avaliação do perfil de citocinas, COX-1 e COX-2 liberados pela ação do veneno da jararaca amazônica, responsável pela maioria dos acidentes ofídicos na região Norte.',
  },
  {
    title:
      'Espécies vegetais amazônicas utilizadas popularmente no tratamento de acidentes por serpentes',
    period: '1995 — atual',
    role: 'Coordenadora',
    funder: '',
    status: 'Em andamento',
    kind: 'pesquisa',
    description:
      'Estudo da toxicidade e das atividades anti-inflamatória, anticoagulante e antiagregante plaquetária de extratos de plantas usadas por comunidades amazônicas, diante da demora no acesso à soroterapia. 27 produções associadas.',
  },
  {
    title: 'Variabilidade dos venenos individuais de Crotalus durissus ruruima',
    period: '1995 — atual',
    role: 'Coordenadora',
    funder: 'CNPq / FUNED',
    status: 'Em andamento',
    kind: 'pesquisa',
    description:
      'Variação intrapopulacional dos componentes proteicos e das atividades biológicas dos venenos de indivíduos adultos da cascavel amazônica. 12 produções associadas.',
  },
  {
    title: 'Ofidismo no Amazonas',
    period: '1992 — 2018',
    role: 'Coordenadora',
    funder: 'CNPq',
    status: 'Concluído',
    kind: 'pesquisa',
    description:
      'Levantamento dos acidentes ofídicos no estado do Amazonas, com 16 alunos de graduação envolvidos e 21 produções associadas.',
  },
  {
    title: 'MEDensina',
    period: '2001 — 2022',
    role: 'Idealizadora e Coordenadora docente',
    funder: 'Secretaria de Estado da Educação e Qualidade do Ensino',
    status: 'Concluído',
    kind: 'extensao',
    description:
      'Projeto de extensão que leva palestras sobre saúde e sexualidade a estudantes do ensino fundamental e médio das redes pública e privada, integrando a universidade à comunidade e ampliando a formação dos futuros profissionais de saúde. Chegou a envolver 30 estudantes de graduação por edição.',
  },
  {
    title: 'Sistema de notificação de acidentes por arraias (SNAA)',
    period: '2012 — atual',
    role: 'Integrante',
    funder: '',
    status: 'Em andamento',
    kind: 'desenvolvimento',
    description:
      'Sistema web e aplicativo móvel para que a comunidade e os profissionais de saúde notifiquem acidentes causados por arraias no Amazonas, suprindo a falta de dados sobre sintomatologia e epidemiologia desses envenenamentos.',
  },
  {
    title: 'Implantação da coleta seletiva de resíduos sólidos no Amazonas',
    period: '2000 — 2004',
    role: 'Coordenadora',
    funder: '',
    status: 'Concluído',
    kind: 'extensao',
    description:
      'Implantação da coleta seletiva nas diferentes unidades da UFAM e trabalho com comunidades vizinhas ao campus, com desdobramento no livro “Lixo: curiosidades e conceitos”.',
  },
  {
    title: 'Rodas de conversa sobre Biofísica e Imunologia Clínica entre países lusófonos',
    period: '2021 — atual',
    role: 'Integrante',
    funder: '',
    status: 'Em andamento',
    kind: 'extensao',
    description: 'Atividade de extensão com estudantes de países de língua portuguesa.',
  },
];

const PUBLICATIONS = [
  {
    year: 2024,
    authors:
      'ANJOS, M. B.; MOURA, V. M.; LAMEIRAS, J. L. V.; DIAS, L. C.; MOURÃO, R. H. V.; DOS-SANTOS, M. C.; COSTA, O. T. F.',
    title:
      'Exploring the Protective Effects of Bellucia dichotoma Cong. Aqueous Extract on Spleens Following Bothrops atrox Envenomation in Mice: A Stereological Investigation',
    venue: 'Journal of Advances in Biology & Biotechnology',
    details: 'v. 27, p. 233-246',
    citations: 0,
    highlight: 1,
  },
  {
    year: 2023,
    authors: 'UREÑA, N. M.; MAIA, M. L. S.; DOS-SANTOS, M. C.; BOECHAT, A. L. R.; FURTADO, S. C.',
    title: 'Depression and anxiety are triggers for Rheumatoid Arthritis — A Systematic Review Protocol',
    venue: 'Scientia Amazonia',
    details: 'v. 12, p. B18-B25',
    citations: 0,
    highlight: 0,
  },
  {
    year: 2022,
    authors: 'MELO-SOUZA, D. C.; CHAGAS, E. C.; LUCKWU-SOUSA, R.; DOS-SANTOS, M. C.',
    title:
      'Profile of local and systemic humoral immune response in Colossoma macropomum infected by Neoechinorhynchus buttnerae',
    venue: 'Aquaculture Research',
    details: 'v. 53, p. 1131-1135',
    citations: 2,
    highlight: 0,
  },
  {
    year: 2021,
    authors: 'SOUZA, M. C. S.; MOURA, V. M.; MOURÃO, R. H. V.; FACHIN-ESPINAR, M. T.; NUNEZ, C. V.; DOS-SANTOS, M. C.',
    title:
      'Antimicrobial activity of Amazonian plant species against the causative agents of secondary infection in snakebites',
    venue: 'Revista Fitos',
    details: 'v. 15, p. 280-297',
    citations: 0,
    highlight: 0,
  },
  {
    year: 2021,
    authors: 'SOUZA, M. V. A.; LIMA JUNIOR, S. A. S.; PEREIRA, E. M. P.; LUCAS, A. C. S.; DOS-SANTOS, M. C.',
    title: 'Projeto MEDensina: relato histórico de vinte anos de atuação',
    venue: 'Scientia Amazonia',
    details: 'v. 10, p. B15-B25',
    citations: 0,
    highlight: 1,
  },
  {
    year: 2020,
    authors:
      'LAMEIRAS, J. L. V.; MOURA, V. M.; CASTANHOLA-DIAS, L.; PESSOA JR., E. R.; MALMANN, C. S. Y.; COSTA, A. G.; NUNEZ, C. V.; COSTA, O. T. F.; DOS-SANTOS, M. C.',
    title:
      'Neutralization of the edema-forming and myotoxic activities of the venom of Potamotrygon motoro by antivenoms and circulating immunoglobulins',
    venue: 'Toxicon',
    details: 'v. 186, p. 126-140',
    citations: 2,
    highlight: 1,
  },
  {
    year: 2020,
    authors: 'GUIMARÃES, N. C.; FREITAS-DE-SOUSA, L. A.; SOUZA, M. C. S.; ALMEIDA, P. D. O.; DOS-SANTOS, M. C.; NUNEZ, C. V.; OLIVEIRA, R. B.; MOURÃO, R. H. V.; MOURA, V. M.',
    title:
      'Evaluation of the anti-snakebite, antimicrobial and antioxidant potential of Philodendron megalophyllum Schott (Araceae)',
    venue: 'Toxicon',
    details: 'v. 184, p. 99-108',
    citations: 7,
    highlight: 0,
  },
  {
    year: 2019,
    authors:
      'DA COSTA, O. T. F.; DIAS, L. C.; MALMANN, C. S. Y.; FERREIRA, C. A. L.; DO CARMO, I. B.; WISCHNESKI, A. G.; DE SOUSA, R. L.; CAVERO, B. A. S.; LAMEIRAS, J. L. V.; DOS-SANTOS, M. C.',
    title:
      'The effects of stocking density on the hematology, plasma protein profile and immunoglobulin production of juvenile tambaqui (Colossoma macropomum) farmed in Brazil',
    venue: 'Aquaculture',
    details: 'v. 499, p. 260-268',
    citations: 46,
    highlight: 1,
  },
  {
    year: 2019,
    authors: 'MELO-SOUZA, D. C.; DOS-SANTOS, M. C.; CHAGAS, E. C.',
    title: 'Immune response of teleost fish to helminth parasite infection',
    venue: 'Revista Brasileira de Parasitologia Veterinária',
    details: 'p. 1-15',
    citations: 34,
    highlight: 0,
  },
  {
    year: 2019,
    authors: 'LAMEIRAS, J. L. V.; COSTA, O. T. F.; DOS-SANTOS, M. C.',
    title:
      'Neotropical freshwater stingrays (Chondrichthyes — Potamotrygoninae): biology, general features and envenomation',
    venue: 'Toxin Reviews',
    details: 'v. 38, p. 1-16',
    citations: 3,
    highlight: 0,
  },
  {
    year: 2019,
    authors:
      'EUZÉBIO-RIBEIRO, S. L.; PEREIRA, H.; BOECHAT, A. L. R.; SATO, E.; CUNHA, M. C. F.; SOUZA PASSOS, L. F.; DOS-SANTOS, M. C.',
    title:
      'Epidemiological, clinical and immune factors that influence the persistence of antiphospholipid antibodies in leprosy',
    venue: 'Advances in Rheumatology',
    details: 'v. 59, p. 1-7',
    citations: 6,
    highlight: 0,
  },
  {
    year: 2018,
    authors:
      'DE MOURA, V. M.; GUIMARÃES, N. C.; BATISTA, L. T.; FREITAS-DE-SOUSA, L. A.; MARTINS, J. S.; SOUZA, M. C. S.; ALMEIDA, P. D. O.; MONTEIRO, W. M.; OLIVEIRA, R. B.; DOS-SANTOS, M. C.; MOURÃO, R. H. V.',
    title:
      'Assessment of the anti-snakebite properties of extracts of Aniba fragrans Ducke (Lauraceae) used in folk medicine as complementary treatment in cases of envenomation by Bothrops atrox',
    venue: 'Journal of Ethnopharmacology',
    details: 'v. 213, p. 350-358',
    citations: 18,
    highlight: 0,
  },
  {
    year: 2017,
    authors:
      'DE MOURA, V. M.; DE SOUZA, L. Y. A.; GUIMARÃES, N. C.; DOS SANTOS, I. G. C.; DE ALMEIDA, P. D. O.; DE OLIVEIRA, R. B.; MOURÃO, R. H. V.; DOS-SANTOS, M. C.',
    title:
      'The potential of aqueous extracts of Bellucia dichotoma Cogn. (Melastomataceae) to inhibit the biological activities of Bothrops atrox venom',
    venue: 'Journal of Ethnopharmacology',
    details: 'v. 196, p. 168-177',
    citations: 12,
    highlight: 1,
  },
  {
    year: 2016,
    authors: 'MOREIRA, V.; TEIXEIRA, C.; D’IMPÉRIO LIMA, M. R.; DA SILVA, H. B.; DOS-SANTOS, M. C.',
    title:
      'The role of TLR2 in the acute inflammatory response induced by Bothrops atrox snake venom',
    venue: 'Toxicon',
    details: 'v. 118, p. 121-128',
    citations: 32,
    highlight: 0,
  },
  {
    year: 2016,
    authors:
      'PEREIRA DA SILVA, T.; MOURA, V. M.; SCHEFFER, M. C.; SANTOS, V. N. C.; SILVA, K. A. M. M.; MENDES, M. G. G.; NUNEZ, C. V.; ALMEIDA, P. D. O.; LIMA, E. S.; MOURÃO, R. H. V.; DOS-SANTOS, M. C.',
    title:
      'Connarus favosus Planch.: an inhibitor of the hemorrhagic activity of Bothrops atrox venom and a potential antioxidant and antibacterial agent',
    venue: 'Journal of Ethnopharmacology',
    details: 'v. 183, p. 166-175',
    citations: 15,
    highlight: 0,
  },
  {
    year: 2015,
    authors:
      'FEITOSA, E.; SACHETT, J.; SILVA, I. M.; DOS-SANTOS, M. C.; FERREIRA, L. C. L.; LACERDA, M.; MONTEIRO, W. M.',
    title:
      'Older Age and Time to Medical Assistance Are Associated with Severity and Mortality of Snakebites in the Brazilian Amazon: A Case-Control Study',
    venue: 'PLoS ONE',
    details: 'v. 10, e0132237',
    citations: 99,
    highlight: 1,
  },
  {
    year: 2015,
    authors:
      'FAN, H. W.; MONTEIRO, W. M.; MOURA DA SILVA, A. M.; TAMBOURGI, D. V.; SILVA, I. M.; SAMPAIO, V.; DOS-SANTOS, M. C.; SACHETT, J.; FERREIRA, L. C. L.; KALIL, J.; LACERDA, M.',
    title:
      'Snakebites and Scorpion Stings in the Brazilian Amazon: Identifying Research Priorities for a Largely Neglected Problem',
    venue: 'PLoS Neglected Tropical Diseases',
    details: 'v. 9, e0003701',
    citations: 91,
    highlight: 1,
  },
  {
    year: 2015,
    authors:
      'MOURA, V. M.; SOUSA, L. A. F.; LIMA, A. E.; DOS-SANTOS, M. C.; RAPOSO, J. D. A.; OLIVEIRA, R. B.; SILVA, M. N.; ARRUDA, A. C.; MOURÃO, R. H. V.',
    title:
      'Plants used to treat snakebites in Santarém, western Pará, Brazil: An assessment of their effectiveness in inhibiting hemorrhagic activity induced by Bothrops jararaca venom',
    venue: 'Journal of Ethnopharmacology',
    details: 'v. 161, p. 224-232',
    citations: 46,
    highlight: 0,
  },
  {
    year: 2014,
    authors:
      'NAIFF, P. F.; FERRAZ, R.; CUNHA, C. F.; ORLANDI, P. P.; BOECHAT, A. L.; BERTHO, Á. L.; DOS-SANTOS, M. C.',
    title:
      'Immunophenotyping in Saliva as an Alternative Approach for Evaluation of Immunopathogenesis in Chronic Periodontitis',
    venue: 'Journal of Periodontology',
    details: 'v. 85, e111-e120',
    citations: 8,
    highlight: 0,
  },
  {
    year: 2013,
    authors: 'BOECHAT, A. L.; OGUSKU, M. M.; SADAHIRO, A.; DOS-SANTOS, M. C.',
    title: 'Association between the PTPN22 1858C/T gene polymorphism and tuberculosis resistance',
    venue: 'Infection, Genetics and Evolution',
    details: 'v. 16, p. 310-313',
    citations: 23,
    highlight: 0,
  },
  {
    year: 2012,
    authors:
      'MOREIRA, V.; DOS-SANTOS, M. C.; NASCIMENTO, N. G.; DA SILVA, H. B.; FERNANDES, C. M.; D’IMPÉRIO LIMA, M. R.; TEIXEIRA, C.',
    title:
      'Local inflammatory events induced by Bothrops atrox snake venom and the release of distinct classes of inflammatory mediators',
    venue: 'Toxicon',
    details: 'v. 60, p. 12-20',
    citations: 67,
    highlight: 0,
  },
  {
    year: 2011,
    authors:
      'DOS-SANTOS, M. C.; ARROYO, C.; SOLANO, S.; HERRERA, M.; VILLALTA, M.; SEGURA, Á.; ESTRADA, R.; GUTIÉRREZ, J. M.; LEÓN, G.',
    title:
      'Comparison of the effect of Crotalus simus and Crotalus durissus ruruima venoms on the equine antibody response towards Bothrops asper venom',
    venue: 'Toxicon',
    details: 'v. 57, p. 237-243',
    citations: 9,
    highlight: 0,
  },
  {
    year: 2011,
    authors:
      'MAGALHÃES, A. L.; SANTOS, G. B.; VERDAM, M. C. S.; FRAPORTI, L. S.; MALHEIRO, A.; LIMA, E. S.; DOS-SANTOS, M. C.',
    title:
      'Inhibition of the inflammatory and coagulant action of Bothrops atrox venom by the plant species Marsypianthes chamaedrys',
    venue: 'Journal of Ethnopharmacology',
    details: 'v. 134, p. 82-88',
    citations: 35,
    highlight: 0,
  },
  {
    year: 2010,
    authors:
      'CALVETE, J. J.; SANZ, L.; CID, P.; DE LA TORRE, P.; FLORES-DÍAZ, M.; DOS SANTOS, M. C.; BORGES, A.; BREMO, A.; ANGULO, Y.; LOMONTE, B.; ALAPE-GIRÓN, A.; GUTIÉRREZ, J. M.',
    title:
      'Snake Venomics of the Central American Rattlesnake Crotalus simus and the South American Crotalus durissus Complex Points to Neurotoxicity as an Adaptive Paedomorphic Trend',
    venue: 'Journal of Proteome Research',
    details: 'v. 9, p. 528-544',
    citations: 170,
    highlight: 1,
  },
  {
    year: 2010,
    authors:
      'MATOS-GOMES, N.; SANTANA, L. L. O.; DOS-SANTOS, M. C.; KATSURAYAMA, M.; PAREDES-GARCIA, E.; BECKER, M. A. D.; MAKIMOTO, F. H.',
    title:
      'Psychological Stress and Its Influence on Salivary Flow Rate, Total Protein Concentration and IgA, IgG and IgM Titers',
    venue: 'Neuroimmunomodulation',
    details: 'v. 17, p. 396-404',
    citations: 47,
    highlight: 1,
  },
  {
    year: 1999,
    authors: 'BORGES, C. C.; SADAHIRO, M.; DOS-SANTOS, M. C.',
    title:
      'Aspectos epidemiológicos e clínicos dos acidentes ofídicos ocorridos nos municípios do Estado do Amazonas',
    venue: 'Revista da Sociedade Brasileira de Medicina Tropical',
    details: 'v. 32, p. 637-646',
    citations: 92,
    highlight: 1,
  },
  {
    year: 1994,
    authors: 'NISHIKAWA, A.; CARICATI, C.; LIMA, M.; DOS-SANTOS, M. C.; KIPNIS, T.; EICKSTEDT, V.; KNYSAK, I.; DA SILVA, M.',
    title: 'Antigenic cross-reactivity among the venoms from several species of Brazilian scorpions',
    venue: 'Toxicon',
    details: 'v. 32, p. 989-998',
    citations: 61,
    highlight: 0,
  },
  {
    year: 1994,
    authors: 'MORAIS, J.; DE FREITAS, M.; YAMAGUCHI, I.; DOS-SANTOS, M. C.; DIAS-DA-SILVA, W.',
    title:
      'Snake antivenoms from hyperimmunized horses: comparison of the antivenom activity and biological properties of their whole IgG and F(ab′)2 fragments',
    venue: 'Toxicon',
    details: 'v. 32, p. 725-734',
    citations: 57,
    highlight: 0,
  },
  {
    year: 1994,
    authors: 'BARROS, A.; FERNANDES, D.; FERREIRA, L.; DOS-SANTOS, M. C.',
    title: 'Local effects induced by venoms from five species of genus Micrurus sp. (coral snakes)',
    venue: 'Toxicon',
    details: 'v. 32, p. 445-452',
    citations: 43,
    highlight: 0,
  },
  {
    year: 1993,
    authors: 'DOS-SANTOS, M. C.',
    title:
      'Caracterización de las actividades biológicas de los venenos “amarillo” y “blanco” de Crotalus durissus ruruima comparados con el veneno de Crotalus durissus terrificus',
    venue: 'Toxicon',
    details: 'v. 31, p. 1459-1469',
    citations: 32,
    highlight: 1,
  },
  {
    year: 1991,
    authors: 'GUTIÉRREZ, J.; DOS-SANTOS, M. C.',
    title:
      'Biochemical and pharmacological similarities between the venoms of newborn Crotalus durissus durissus and adult Crotalus durissus terrificus rattlesnakes',
    venue: 'Toxicon',
    details: 'v. 29, p. 1273-1277',
    citations: 51,
    highlight: 0,
  },
  {
    year: 1989,
    authors: 'DOS-SANTOS, M. C.; D’IMPÉRIO LIMA, M.; FURTADO, G.; COLLETTO, G.; KIPNIS, T.; DIAS-DA-SILVA, W.',
    title:
      'Purification of F(ab′)₂ anti-snake venom by caprylic acid: a fast method for obtaining IgG fragments with high neutralization activity, purity and yield',
    venue: 'Toxicon',
    details: 'v. 27, p. 297-303',
    citations: 71,
    highlight: 1,
  },
  {
    year: 1989,
    authors: 'DOS-SANTOS, M. C.; YAMAGUCHI, I. K.; CARICATTI, C. P.; HIGASHI, H. G.; DIAS-DA-SILVA, W.',
    title:
      'Immunization of equines with phospholipase A2 protects against the lethal effects of Crotalus durissus terrificus venom',
    venue: 'Brazilian Journal of Medical and Biological Research',
    details: 'v. 22, p. 509-512',
    citations: 8,
    highlight: 0,
  },
  {
    year: 1988,
    authors: 'DOS-SANTOS, M. C.; DINIZ, C.; WHITAKER-PACHECO, M.; DIAS-DA-SILVA, W.',
    title:
      'Phospholipase A2 injection in mice induces immunity against the lethal effects of Crotalus durissus terrificus venom',
    venue: 'Toxicon',
    details: 'v. 26, p. 207-213',
    citations: 22,
    highlight: 0,
  },
];

const LIVROS = [
  {
    year: 2021,
    authors:
      'UREÑA, N. M.; FERNANDES, G. V. L.; PORTELA, F. L. D.; SOUZA, M. C. S.; SARTIM, A. G.; BOECHAT, A. L. R.; DOS-SANTOS, M. C.',
    title:
      'Integração dos sistemas nervoso, endócrino, imune e da microbiota intestinal na manutenção da saúde — uma visão geral da Psiconeuroimunologia',
    venue: 'Manaus: Amazon',
    details: '1ª ed., 78 p.',
    kind: 'livro',
    highlight: 1,
  },
  {
    year: 2009,
    authors: 'DOS-SANTOS, M. C.',
    title: 'Serpentes peçonhentas e ofidismo no Amazonas',
    venue: 'In: Animais Peçonhentos no Brasil (2ª ed.). São Paulo: Sarvier',
    details: 'Capítulo de livro',
    kind: 'capitulo',
    highlight: 1,
  },
  {
    year: 2002,
    authors: 'DOS-SANTOS, M. C.; TOPAN, C. S. O.; LIMA, E. K. R.',
    title: 'Lixo: curiosidades e conceitos',
    venue: 'Manaus: EDUA — Editora da Universidade Federal do Amazonas',
    details: '150 p.',
    kind: 'livro',
    highlight: 0,
  },
  {
    year: 1996,
    authors: 'DOS-SANTOS, M. C.; MARTINS, M.; BOECHAT, A. L.; SÁ-NETO, R. P.; OLIVEIRA, A.',
    title: 'Serpentes de interesse médico da Amazônia',
    venue: 'Manaus: ABEU — Associação Brasileira das Editoras Universitárias',
    details: '64 p.',
    kind: 'livro',
    highlight: 1,
  },
];

const AWARDS = [
  {
    year: 2019,
    title:
      'Orientação da melhor tese de 2018 — “Produção de soro hiperimune para Potamotrygon motoro”',
    org: 'Pró-Reitoria de Pesquisa e Pós-Graduação — UFAM',
  },
  {
    year: 2014,
    title:
      'Menção honrosa — “Plantas medicinais utilizadas no tratamento de acidentes ofídicos pela população da Região Oeste do Pará”',
    org: 'XXIII Simpósio de Plantas Medicinais do Brasil',
  },
  {
    year: 2010,
    title: 'Professora Destaque 2009',
    org: 'Diretório Acadêmico de Medicina Humberto Mendonça — UFAM',
  },
];

const CATEGORIES = [
  {
    slug: 'animais-peconhentos',
    name: 'Animais peçonhentos',
    description:
      'Serpentes, arraias, escorpiões e aranhas: o que a ciência sabe sobre seus venenos e sobre os acidentes que causam.',
    color: '#b45309',
    position: 1,
  },
  {
    slug: 'antivenenos-e-tratamentos',
    name: 'Antivenenos e tratamentos',
    description:
      'Soroterapia, plantas medicinais amazônicas e novas abordagens para tratar envenenamentos.',
    color: '#0f766e',
    position: 2,
  },
  {
    slug: 'imunologia-do-dia-a-dia',
    name: 'Imunologia do dia a dia',
    description: 'Como o sistema imune funciona, explicado sem jargão.',
    color: '#1d4ed8',
    position: 3,
  },
  {
    slug: 'psiconeuroimunologia',
    name: 'Psiconeuroimunologia',
    description: 'A conversa entre mente, cérebro, hormônios, microbiota e defesa do corpo.',
    color: '#7c3aed',
    position: 4,
  },
  {
    slug: 'ciencia-na-amazonia',
    name: 'Ciência na Amazônia',
    description: 'Pesquisa feita no Norte, sobre o Norte, com as pessoas do Norte.',
    color: '#15803d',
    position: 5,
  },
  {
    slug: 'li-e-comento',
    name: 'Li e comento',
    description:
      'Artigos, notícias e estudos que encontrei por aí — com meu comentário sobre o que eles significam.',
    color: '#be123c',
    position: 6,
  },
];

/* ------------------------------------------------------------ posts demo */

const POSTS = [
  {
    title: 'Por que o soro antiofídico não resolve tudo — e o que a floresta tem a ver com isso',
    subtitle: 'Sobre o tempo até o atendimento, as lesões locais e as plantas que a população usa',
    category: 'antivenenos-e-tratamentos',
    tags: ['Antivenenos', 'Bothrops atrox', 'Plantas medicinais', 'Amazônia'],
    featured: 1,
    body: `Quem trabalha com acidentes ofídicos na Amazônia aprende cedo uma lição incômoda: o soro
antiofídico salva vidas, mas não salva membros.

O soro neutraliza muito bem as ações sistêmicas do veneno — a hemorragia, a alteração da
coagulação, a insuficiência renal. É por isso que a mortalidade por picada de serpente caiu
tanto desde que a soroterapia foi organizada no Brasil. O problema é outro: as **ações locais**.

## O que acontece no lugar da picada

O veneno de *Bothrops atrox*, a jararaca responsável pela maioria dos acidentes na região Norte,
provoca no local da picada uma lesão que se instala em minutos: edema, dor intensa, bolhas,
hemorragia, mionecrose e uma resposta inflamatória exuberante. Nossos trabalhos e os de outros
grupos mostraram que essa inflamação envolve receptores como o TLR2 e a liberação de classes
distintas de mediadores inflamatórios.

Quando o paciente chega ao hospital seis, dez, vinte e quatro horas depois — e no interior do
Amazonas isso é rotina, porque a distância entre a comunidade e o hospital se mede em horas ou
dias de barco — o veneno já fez o estrago local. O soro chega tarde para aquele tecido. A
amputação de membros acometidos ainda é uma realidade.

## Onde entram as plantas

Diante disso, quem vive à beira do rio faz o que sempre fez: usa o que tem. As comunidades
amazônicas têm um repertório de espécies vegetais aplicadas ao acidente ofídico, e por muito
tempo a ciência olhou para isso com desdém.

Nós resolvemos olhar com método. Ao longo dos anos testamos extratos de várias espécies contra
as atividades biológicas do veneno botrópico. *Bellucia dichotoma*, por exemplo, demonstrou
potencial real para bloquear efeitos locais que o antibotrópico não neutraliza bem. *Connarus
favosus* inibiu a atividade hemorrágica. *Aniba fragrans*, usada na região oeste do Pará,
também mostrou propriedades antiofídicas.

Isso **não** significa que alguém deva trocar o soro por chá de planta. Significa o contrário:
significa que existe um espaço terapêutico — o das primeiras horas, longe do hospital, e o do
tratamento complementar da lesão local — que a soroterapia sozinha não cobre, e que talvez
possa ser ocupado por um fitoterápico devidamente estudado, padronizado e testado.

## O que estamos fazendo agora

É exatamente esse o objetivo do projeto que coordeno desde 2017: transformar o extrato de
*Bellucia dichotoma* em uma forma farmacêutica com propriedades anti-inflamatórias e
antimicrobianas — porque a infecção secundária é outro problema sério nesses acidentes — para
uso complementar à soroterapia.

O caminho é longo e passa por toxicidade, padronização, ensaios pré-clínicos. Mas a pergunta que
o orienta é simples e vem do rio: **o que fazer nas horas em que o soro ainda não chegou?**`,
  },
  {
    title: 'Arraias de água doce: o acidente que quase ninguém notifica',
    subtitle: 'Uma dor que marca a vida — e um veneno para o qual ainda não existe antídoto',
    category: 'animais-peconhentos',
    tags: ['Arraias', 'Amazônia', 'Saúde pública', 'Potamotrygon'],
    featured: 1,
    body: `Se você perguntar a um ribeirinho do Amazonas qual foi a pior dor que ele já sentiu, há uma
boa chance de a resposta ser: arraia.

As arraias de água doce da família Potamotrygonidae vivem nos rios da América do Sul e estão
distribuídas, no Brasil, pelas regiões Norte, Centro-Oeste e Sudeste. Têm de um a três ferrões
de dentina na base da cauda, cobertos por uma bainha tegumentar com glândulas de muco e de
veneno. O animal não ataca: ele se esconde sob a areia. O acidente acontece quando alguém pisa
no seu dorso.

## Por que dói tanto — e por que infecciona

O ferrão entra no pé ou no calcanhar e injeta o veneno. A dor é descrita como insuportável.
Depois vem o edema, e com frequência a ferida infecciona e evolui para necrose do tecido. Em
nossos estudos com os venenos de *Plesiotrygon iwamae* e *Potamotrygon motoro* documentamos
atividade edematogênica, miotóxica e até rabdomiólise sistêmica.

E aqui está o ponto difícil: **não existe antiveneno específico** para arraias de água doce
disponível no sistema de saúde. O tratamento é sintomático — anti-inflamatórios, antibióticos,
controle da dor.

## Um problema invisível por falta de número

O que mais me incomoda nesse assunto não é apenas a ausência do antídoto. É a ausência do dado.

Os acidentes por arraias são frequentes no Amazonas, mas quase não são notificados. Sem
notificação não há epidemiologia; sem epidemiologia, o problema não entra na fila das
prioridades de saúde pública; e sem prioridade, não há investimento em soro. É um ciclo que se
alimenta do próprio silêncio.

Foi por isso que participamos do desenvolvimento de um sistema web e de um aplicativo para
notificação de acidentes por arraias — para que tanto o profissional de saúde quanto a própria
comunidade pudessem registrar o que acontece.

## O que já conseguimos mostrar

A tese que orientei sobre a produção de soro hiperimune para *Potamotrygon motoro* — premiada
como melhor tese de 2018 pela Pró-Reitoria de Pesquisa da UFAM — mostrou que é possível produzir
imunoglobulinas capazes de neutralizar as atividades edematogênica e miotóxica desse veneno, e
que existe reação cruzada com peçonhas de outras espécies de arraias.

Ou seja: a ciência do antídoto é viável. Falta a decisão de produzi-lo. E essa decisão depende,
em boa medida, de alguém contar quantas pessoas estão pisando em arraias.`,
  },
  {
    title: 'Estresse baixa a imunidade? O que a saliva de estudantes de Medicina nos contou',
    subtitle: 'Psiconeuroimunologia sem misticismo: o que é medido, o que é inferido',
    category: 'psiconeuroimunologia',
    tags: ['Psiconeuroimunologia', 'Estresse', 'Saliva', 'Imunologia'],
    featured: 0,
    body: `“Estresse baixa a imunidade” é daquelas frases que todo mundo repete e quase ninguém consegue
explicar. Trabalho com psiconeuroimunologia há duas décadas justamente porque essa frase merece
mais rigor do que costuma receber.

## O desenho do estudo

A pergunta era direta: o estresse psicológico altera parâmetros imunológicos mensuráveis?

Escolhemos uma população conveniente e cronicamente estressada — estudantes de Medicina e
médicos residentes dos hospitais universitários da UFAM — e um material de coleta não invasivo:
a saliva. Comparamos amostras colhidas no início do ano letivo e durante as provas finais,
medindo títulos de imunoglobulinas das classes A, G e M, concentração de proteínas, atividade da
amilase, fluxo salivar e o fenótipo das células presentes.

## O que encontramos

Encontramos alterações significativas no fluxo salivar, na concentração total de proteínas e nos
títulos de IgA, IgG e IgM associadas ao nível de estresse psicológico. Também conseguimos
fenotipar as células presentes na saliva de indivíduos sob estresse — algo que, na época,
praticamente não havia sido feito.

Vale sublinhar o que isso **não** quer dizer. Não quer dizer que ansiedade causa doença. Quer
dizer que o eixo entre sistema nervoso, endócrino e imune é real, mensurável, e que a saliva —
barata, indolor, coletável em qualquer lugar — serve como janela para observá-lo.

## Por que a saliva importa aqui

Essa é uma agenda que me interessa muito na Amazônia. Um exame que dispensa agulha, centrífuga e
cadeia de frio é um exame que pode chegar a uma comunidade ribeirinha. Estudamos a saliva
também em periodontite crônica, em pacientes irradiados de cabeça e pescoço, e em
imunodeficiência comum variável — sempre com a mesma lógica: o que dá para saber sobre a defesa
do corpo sem furar o braço de ninguém?

A psiconeuroimunologia tem um problema de reputação: atrai muito misticismo. A resposta a isso
não é abandonar o campo — é medir melhor.`,
  },
];

/* ------------------------------------------------------------- execução  */

function reset() {
  const tables = [
    'post_tags',
    'comments',
    'post_views',
    'posts',
    'tags',
    'categories',
    'publications',
    'research_lines',
    'projects',
    'timeline',
    'awards',
    'messages',
    'subscribers',
    'media',
    'activity_log',
    'sessions',
    'users',
    'settings',
  ];
  for (const t of tables) db.exec(`DELETE FROM ${t}`);
  db.exec('DELETE FROM posts_fts');
  console.log('· banco limpo');
}

function ensureAdmin() {
  const existing = q.get('SELECT id FROM users LIMIT 1');
  if (existing) return existing.id;

  const email = process.env.ADMIN_EMAIL || 'maria@site.local';
  const password =
    process.env.ADMIN_PASSWORD || `mcs-${crypto.randomBytes(4).toString('hex')}-2026`;

  const info = q.run(
    'INSERT INTO users (name, email, password_hash, role, bio) VALUES (?, ?, ?, ?, ?)',
    'Maria Cristina dos Santos Sobreira de Sampaio',
    email,
    hashPassword(password),
    'admin',
    'Professora Titular (aposentada) do Instituto de Ciências Biológicas da UFAM.',
  );

  const aviso = `ACESSO AO ADMINISTRADOR
=======================

Endereço:  http://localhost:3000/admin
E-mail:    ${email}
Senha:     ${password}

Troque a senha no menu "Ajustes" logo no primeiro acesso.
Este arquivo pode ser apagado depois.
`;
  fs.writeFileSync(path.join(DATA_DIR, 'PRIMEIRO-ACESSO.txt'), aviso, 'utf8');
  console.log('\n' + aviso);
  return Number(info.lastInsertRowid);
}

function seedTable(table, rows, columns) {
  const count = q.get(`SELECT COUNT(*) AS n FROM ${table}`).n;
  if (count > 0) {
    console.log(`· ${table}: já tem ${count} registro(s), pulando`);
    return;
  }
  const cols = columns.join(', ');
  const marks = columns.map(() => '?').join(', ');
  const stmt = db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${marks})`);
  for (const row of rows) stmt.run(...columns.map((c) => row[c] ?? null));
  console.log(`· ${table}: ${rows.length} registro(s)`);
}

function seedPosts(authorId) {
  if (q.get('SELECT COUNT(*) AS n FROM posts').n > 0) {
    console.log('· posts: já existem, pulando');
    return;
  }

  let offsetDays = 3;
  for (const p of POSTS) {
    const cat = q.get('SELECT id FROM categories WHERE slug = ?', p.category);
    const stats = readingStats(p.body);
    const published = new Date(Date.now() - offsetDays * 864e5).toISOString().slice(0, 19).replace('T', ' ');
    offsetDays += 9;

    const info = q.run(
      `INSERT INTO posts
       (slug, title, subtitle, excerpt, body_md, body_html, category_id, author_id,
        status, featured, published_at, reading_time, word_count, seo_description)
       VALUES (?,?,?,?,?,?,?,?,'published',?,?,?,?,?)`,
      slugify(p.title),
      p.title,
      p.subtitle || '',
      summarize(p.body, 240),
      p.body,
      renderMarkdown(p.body),
      cat?.id ?? null,
      authorId,
      p.featured ? 1 : 0,
      published,
      stats.readingTime,
      stats.wordCount,
      summarize(p.body, 150),
    );
    const postId = Number(info.lastInsertRowid);

    for (const name of p.tags) {
      const slug = slugify(name);
      q.run('INSERT OR IGNORE INTO tags (slug, name) VALUES (?, ?)', slug, name);
      const tag = q.get('SELECT id FROM tags WHERE slug = ?', slug);
      q.run('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)', postId, tag.id);
    }
    reindexPost(postId);
  }
  console.log(`· posts: ${POSTS.length} publicados`);
}

function main() {
  if (RESET) reset();

  const authorId = ensureAdmin();

  seedTable('categories', CATEGORIES, ['slug', 'name', 'description', 'color', 'position']);
  seedTable(
    'timeline',
    [...TIMELINE, ...FORMACAO],
    ['period', 'sort_year', 'title', 'org', 'description', 'kind'],
  );
  seedTable(
    'research_lines',
    RESEARCH_LINES.map((r, i) => ({ ...r, position: i })),
    ['title', 'summary', 'keywords', 'icon', 'position'],
  );
  seedTable(
    'projects',
    PROJECTS.map((p, i) => ({ ...p, position: i })),
    ['title', 'period', 'role', 'funder', 'status', 'kind', 'description', 'position'],
  );
  seedTable(
    'publications',
    [...PUBLICATIONS, ...LIVROS].map((p, i) => ({ kind: 'artigo', highlight: 0, ...p, position: i })),
    ['year', 'authors', 'title', 'venue', 'details', 'citations', 'kind', 'highlight', 'position'],
  );
  seedTable('awards', AWARDS, ['year', 'title', 'org']);

  seedPosts(authorId);

  const settings = getSettings();
  if (!settings.seeded) {
    setSetting('seeded', '1');
    setSetting('site_title', 'Maria Cristina dos Santos Sobreira de Sampaio');
    setSetting(
      'site_tagline',
      'Imunologia, animais peçonhentos e ciência feita na Amazônia',
    );
    console.log('· ajustes iniciais gravados');
  }

  console.log('\nPronto. Rode "npm start" e abra http://localhost:3000\n');
}

main();
