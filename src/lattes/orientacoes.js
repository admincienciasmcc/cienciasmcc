'use strict';

/**
 * Orientações e supervisões concluídas e em andamento — do Lattes.
 * kind: doutorado | mestrado | tcc | iniciacao | outra
 */

const ORIENTACOES = [
  /* ------------------------------------------------- em andamento ------ */
  {
    year: 2020,
    kind: 'doutorado',
    status: 'em andamento',
    student: 'Nathalie Marte Ureña',
    title:
      'Avaliação do stress, da ansiedade, da depressão e de marcadores inflamatórios salivares em acadêmicos do Curso de Medicina, antes e após o tratamento com a Técnica Anti-stress com Biofeedback',
    role: 'Orientadora',
  },

  /* ------------------------------------------- teses de doutorado ----- */
  {
    year: 2022,
    kind: 'doutorado',
    student: 'Luana Travassos Batista',
    title:
      'Propriedades anti-inflamatórias e potencial para fitoterapia da espécie vegetal, de uso tradicional da região Amazônica, Bellucia dichotoma',
    role: 'Orientadora',
    funding: 'FAPEAM',
  },
  {
    year: 2020,
    kind: 'doutorado',
    student: 'Rafael Luckwu de Sousa',
    title:
      'Desenvolvimento de conjugados anti-imunoglobulinas séricas classes específicas de tambaqui (Colossoma macropomum) para imunodiagnósticos',
    role: 'Orientadora',
  },
  {
    year: 2020,
    kind: 'doutorado',
    student: 'Damy Caroline de Melo Souza',
    title:
      'Avaliação do uso de imunoestimulantes sobre desempenho produtivo e componentes imunes da mucosa intestinal de Colossoma macropomum não infectados e infectados pelo acantocéfalo Neoechinorhynchus buttnerae',
    role: 'Orientadora',
  },
  {
    year: 2019,
    kind: 'doutorado',
    student: 'Maria Carolina Scheffer de Souza',
    title:
      'Bioprospecção de plantas antimicrobianas para microrganismos causadores de infecção secundária em acidentes ofídicos',
    role: 'Orientadora',
    funding: 'CNPq',
  },
  {
    year: 2018,
    kind: 'doutorado',
    student: 'Juliana Luiza Varjão Lameiras',
    title:
      'Produção de soro hiperimune para Potamotrygon motoro Müller & Henle, 1841 (Chondrichthyes — Potamotrygonidae): verificação da reação-cruzada frente às peçonhas de outras espécies de arraias e da neutralização das atividades edematogênica e miotóxica',
    role: 'Orientadora',
    funding: 'CAPES',
  },
  {
    year: 2017,
    kind: 'doutorado',
    student: 'Ilia Gilmara Carvalho dos Santos',
    title:
      'Avaliação da atividade antimicrobiana dos venenos variedades “amarela” e “branca” da serpente amazônica Crotalus durissus ruruima',
    role: 'Orientadora',
    funding: 'FAPEAM',
  },
  {
    year: 2017,
    kind: 'doutorado',
    student: 'Antonio Claudio Kieling',
    title:
      'Obtenção do Ecocompósito amazônico de PET e pó de madeira de Tucumã (Astrocaryum aculeatum)',
    role: 'Orientadora',
  },
  {
    year: 2016,
    kind: 'doutorado',
    student: 'Valéria Mourão de Moura',
    title:
      'Avaliação do potencial antiofídico dos extratos aquosos de Bellucia dichotoma Cogn. (Melastomataceae) elaborados de acordo com o uso tradicional',
    role: 'Orientadora',
    funding: 'CNPq',
  },
  {
    year: 2014,
    kind: 'doutorado',
    student: 'Sandra Lúcia Euzébio Ribeiro',
    title:
      'Persistência de anticorpos antifosfolipídeos na hanseníase: aspectos epidemiológicos, clínicos e imunológicos associados',
    role: 'Orientadora',
  },
  {
    year: 2011,
    kind: 'doutorado',
    student: 'Maria Zeli Moreira Frota',
    title:
      'Avaliação de métodos de extração de DNA e de identificação de dermatófitos por análise de PCR-RFLP',
    role: 'Orientadora',
  },
  {
    year: 2010,
    kind: 'doutorado',
    student: 'Antônio Luiz Ribeiro Boechat',
    title:
      'Influência de polimorfismos dos genes TNF e PTPN22 na Artrite Reumatoide e Tuberculose, no Amazonas',
    role: 'Orientadora',
  },
  {
    year: 2009,
    kind: 'doutorado',
    student: 'Sérgio Roberto Lopes Albuquerque',
    title:
      'Estudo das associações entre os fenótipos ABO, Rh, Duffy, os genótipos de Duffy com a malária vivax no Estado do Amazonas',
    role: 'Orientadora',
  },
  {
    year: 2007,
    kind: 'doutorado',
    student: 'Luiz Fernando de Souza Passos',
    title: 'Polimorfismo do gene PDCD1 em pacientes da Amazônia com Lúpus Eritematoso Sistêmico',
    role: 'Orientadora',
  },

  /* ------------------------------------ dissertações de mestrado ------ */
  {
    year: 2019,
    kind: 'mestrado',
    student: 'Rafael Luckwu de Sousa',
    title:
      'Desenvolvimento de uma Startup e de ferramentas para diagnósticos de doenças endêmicas de tambaqui (Colossoma macropomum)',
    role: 'Coorientadora',
    funding: 'CAPES',
  },
  {
    year: 2019,
    kind: 'mestrado',
    student: 'Damy Caroline de Melo Souza',
    title:
      'Avaliação da resposta humoral de tambaqui, Colossoma macropomum, infectado pelo acantocéfalo Neoechinorhynchus buttnerae',
    role: 'Coorientadora',
    funding: 'CAPES',
  },
  {
    year: 2017,
    kind: 'mestrado',
    student: 'Jennifer Salgado da Fonseca',
    title:
      'Geração de energia a partir da degradação de óleos residuais de fritura por Shewanella putrefaciens em célula a combustível microbiano',
    role: 'Orientadora',
    funding: 'CAPES',
  },
  {
    year: 2016,
    kind: 'mestrado',
    student: 'Luana Kelly Lima Santana',
    title: 'Desenvolvimento de imunossensor para a detecção de fator de necrose tumoral alfa',
    role: 'Orientadora',
  },
  {
    year: 2015,
    kind: 'mestrado',
    student: 'Thaís Pereira da Silva',
    title:
      'Atividades antioxidante e antimicrobiana de Connarus favosus Planch e seu papel bloqueador da atividade hemorrágica do veneno de Bothrops atrox, de acordo com o uso tradicional',
    role: 'Orientadora',
  },
  {
    year: 2012,
    kind: 'mestrado',
    student: 'Priscilla Farias Naiff',
    title:
      'Perfis: microbiológico, celular e de imunoglobulina presentes em saliva de adultos com Periodontite Crônica',
    role: 'Orientadora',
  },
  {
    year: 2011,
    kind: 'mestrado',
    student: 'Juliana Luiza Varjão Lameiras',
    title:
      'Perfil proteico e atividade inflamatória induzida pelos extratos de tecido da arraia Plesiotrygon iwamae (Chondrichthyes — Potamotrygonidae)',
    role: 'Coorientadora',
    funding: 'FAPEAM',
  },
  {
    year: 2010,
    kind: 'mestrado',
    student: 'Alcineide Lima Magalhães',
    title:
      'Avaliação do potencial anti-inflamatório de Marsypianthes chamaedrys (Vahl) Kuntz (Lamiaceae) frente ao veneno de Bothrops atrox',
    role: 'Orientadora',
    funding: 'FAPEAM',
  },
  {
    year: 2008,
    kind: 'mestrado',
    student: 'Alexandre Magalhães',
    title:
      'Estudo sobre a capacidade indutora de zoodermatose da esponja dulciaquícola Drulia uruguayensis, Bonetto & Ezcurra de Drago, 1968 (Porifera: Metaniidae), em camundongos',
    role: 'Orientadora',
    funding: 'FAPEAM',
  },
  {
    year: 2008,
    kind: 'mestrado',
    student: 'Michella Bezerra Lima',
    title: 'Desenvolvimento de Imunossensor para Detecção do Fator de Necrose Tumoral (TNF-alfa)',
    role: 'Orientadora',
  },
  {
    year: 2008,
    kind: 'mestrado',
    student: 'Selma B. Perdomo',
    title: 'Feridas em pés de pacientes diabéticos e seus impactos sobre a Qualidade de Vida',
    role: 'Orientadora',
    funding: 'FAPEAM',
  },
  {
    year: 2006,
    kind: 'mestrado',
    student: 'Ana Lúcia Soares Machado',
    title:
      'Modelo de Gerenciamento de Resíduos Sólidos Classe II e III, para a Vila Residencial de Balbina, Município de Presidente Figueiredo — Amazonas',
    role: 'Coorientadora',
    funding: 'CNPq',
  },
  {
    year: 2005,
    kind: 'mestrado',
    student: 'Francimary de Oliveira Cavalcante',
    title:
      'Presença de aloanticorpos eritrocitários em gestantes Rh negativo atendidas na Fundação de Hematologia e Hemoterapia do Amazonas (HEMOAM)',
    role: 'Orientadora',
  },
  {
    year: 2004,
    kind: 'mestrado',
    student: 'Lia Mizobe Ono',
    title:
      'Avaliação da composição proteica da saliva em pacientes irradiados na região de cabeça e pescoço',
    role: 'Orientadora',
  },

  /* ---------------------------- trabalhos de conclusão de curso ------- */
  {
    year: 2017,
    kind: 'tcc',
    student: 'Luana Yamille Andrade de Souza',
    title:
      'Verificação do potencial antiofídico dos extratos aquosos de Bellucia dichotoma Cogn., oriundos do Pará e Amazonas, frente às atividades fosfolipásica A2, coagulante e enzimática da peçonha de Bothrops atrox',
    role: 'Orientadora',
    institution: 'Ciências Biológicas — UFAM',
  },
  {
    year: 2016,
    kind: 'tcc',
    student: 'Rafael Luckwu de Sousa',
    title:
      'Influência da densidade de estocagem sobre as imunoglobulinas e demais proteínas plasmáticas de tambaqui (Colossoma macropomum — Characidae)',
    role: 'Orientadora',
    institution: 'Ciências Biológicas — UFAM',
  },

  /* ------------------------------------------- iniciação científica --- */
  { year: 2019, kind: 'iniciacao', student: 'Matheus Felipe Ketes Bergamin', title: 'Verificação da variabilidade individual dos constituintes proteicos dos venenos de Bothrops atrox para a elaboração de imunodiagnóstico', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 2017, kind: 'iniciacao', student: 'Thais Andréa dos Anjos Martins', title: 'Estudo comparativo das lesões hepáticas encontradas em camundongos injetados com o veneno de Bothrops atrox e tratados com a espécie vegetal Bellucia dichotoma', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 2017, kind: 'iniciacao', student: 'Yanna Queiroz Pereira de Sá', title: 'Avaliação de miotoxicidade sistêmica induzida pelo veneno de Bothrops atrox e verificação do bloqueio dessa atividade pela espécie vegetal Bellucia dichotoma', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2017, kind: 'iniciacao', student: 'Ana Carolina Queiroz Cândido da Silva', title: 'Perfil imune e desfechos cardiovasculares em pacientes com doenças da Artéria Coronariana (DAC), atendidos no Serviço de Cardiologia do Hospital Universitário Francisca Mendes', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2017, kind: 'iniciacao', student: 'Adryadne da Silva Adolfs', title: 'Estudo comparativo de nefrotoxicidade encontrada em camundongos injetados com veneno de Bothrops atrox e tratados com a espécie vegetal Bellucia dichotoma', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 2017, kind: 'iniciacao', student: 'Yanna Queiroz Pereira de Sá', title: 'Detecção e quantificação dos venenos circulantes de Bothrops atrox ou Lachesis muta muta no plasma de pacientes atendidos na Fundação de Medicina Tropical Doutor Heitor Vieira Dourado', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 2016, kind: 'iniciacao', student: 'Thais Andréa dos Anjos Martins', title: 'Quantificação de mastócitos locais, em camundongos, injetados com o veneno de Bothrops atrox e tratados com a espécie vegetal antiofídica Bellucia dichotoma', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 2016, kind: 'iniciacao', student: 'Luana Yamille Andrade de Souza', title: 'Verificação do potencial antiofídico dos extratos aquosos de Bellucia dichotoma Cogn, oriundos do Pará e Amazonas, frente às atividades coagulante e enzimática da peçonha de Bothrops atrox', role: 'Orientadora', institution: 'Ciências Biológicas — UFAM', funding: 'CNPq' },
  { year: 2016, kind: 'iniciacao', student: 'Igor Lucas Menezes Aguiar', title: 'Quantificação de mastócitos locais, em camundongos, injetados com o veneno de Bothrops atrox e tratados com a espécie vegetal antiofídica Bellucia dichotoma', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2014, kind: 'iniciacao', student: 'Edevair Mazarão Neto', title: 'Acidente ofídico no Amazonas: determinação, em pacientes, da quantidade de veneno circulante', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 2013, kind: 'iniciacao', student: 'José Dantas de Góes Filho', title: 'Purificação de imunoglobulinas dos peixes ósseos (tambaqui e pirarucu) e cartilaginoso (arraia) pelos métodos de precipitação com ácido caprílico e afinidade com proteínas A ou G', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2012, kind: 'iniciacao', student: 'Camilo Vasconcellos Dias', title: 'Purificação de imunoglobulinas de peixes pelo método do ácido caprílico', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'FAPEAM' },
  { year: 2012, kind: 'iniciacao', student: 'Rafael Oliveira', title: 'Caracterização das atividades biológicas das arraias da Amazônia', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 2012, kind: 'iniciacao', student: 'Rafael Luckwu de Sousa', title: 'Obtenção de Imunoglobulinas humanas de amostras de plasma e soro', role: 'Orientadora', institution: 'Ciências Biológicas — UFAM' },
  { year: 2006, kind: 'iniciacao', student: 'Nathália Matos Gomes', title: 'Avaliação dos Níveis de Estresse Psicológico em Médicos Residentes dos Hospitais Universitários da UFAM: Aspectos Imunológicos e Psicológicos', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 2006, kind: 'iniciacao', student: 'Francisco Flauber D. dos Santos Filho', title: 'Avaliação dos Níveis de Estresse Psicológico em Médicos dos Hospitais Universitários da UFAM: Aspectos Imunológicos e Psicológicos', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 2006, kind: 'iniciacao', student: 'Fabiano Hiromichi Makimoto', title: 'Avaliação dos componentes celulares presentes na saliva de Médicos Residentes e Não Residentes dos Hospitais Universitários da UFAM', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 2005, kind: 'iniciacao', student: 'Julianne Queiroz Bessa', title: 'Estudo fitoquímico das raízes de Brosimum acutifolium', role: 'Orientadora', institution: 'UFAM', funding: 'CNPq' },
  { year: 2005, kind: 'iniciacao', student: 'Bruno Albuquerque Sousa', title: 'Implantação do modelo de artrite induzida por adjuvante em ratos Lewis para screening de produtos fitoterápicos da Amazônia com potencial terapêutico em artrite reumatóide', role: 'Orientadora', institution: 'UFAM', funding: 'CNPq' },
  { year: 2005, kind: 'iniciacao', student: 'Paulo Gabriel Melo Brandão', title: 'Implantação do modelo de artrite induzida por adjuvante em ratos Lewis para screening de produtos da Peltodon radicans com potencial terapêutico em artrite reumatóide', role: 'Orientadora', institution: 'UFAM', funding: 'FAPEAM' },
  { year: 2005, kind: 'iniciacao', student: 'Nathália Matos Gomes', title: 'Estudo comparativo do estresse em estudantes de medicina: aspectos imunológicos e psicológicos', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 2005, kind: 'iniciacao', student: 'Polliana Albuquerque Signoni', title: 'Verificação das frações isoladas de Brosimum acutifolium no tratamento de artrite induzida por adjuvante completo de Freund, em ratos Lewis', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'FAPEAM' },
  { year: 2005, kind: 'iniciacao', student: 'Priscilla Marques', title: 'Avaliação da toxicidade da Brosimum acutifolium', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 1998, kind: 'iniciacao', student: 'Francisco Antonio Rodrigues de Paula', title: 'Resposta imune induzida pelos venenos individuais de Crotalus durissus ruruima', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 1998, kind: 'iniciacao', student: 'Gustavo C. Maio Aguiar', title: 'Resposta imune induzida pelos venenos individuais de Crotalus durissus ruruima', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 1997, kind: 'iniciacao', student: 'Andrea P. Mendonça', title: 'Sistema de informações de Animais Peçonhentos', role: 'Orientadora', institution: 'Economia — UFAM', funding: 'CNPq' },
  { year: 1997, kind: 'iniciacao', student: 'Márcia Roberta Falcão de Farias', title: 'Sistema de Informação de Animais Peçonhentos', role: 'Orientadora', institution: 'Física — UFAM', funding: 'CNPq' },
  { year: 1996, kind: 'iniciacao', student: 'Célio Campos Borges', title: 'Aspectos epidemiológicos e clínicos dos acidentes ofídicos ocorridos no interior do Amazonas', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 1996, kind: 'iniciacao', student: 'Têmis Desirê Moreira', title: 'Estudo da variação intrapopulacional dos venenos da cascavel amazônica Crotalus durissus ruruima', role: 'Orientadora', institution: 'Farmácia — UFAM', funding: 'CNPq' },
  { year: 1995, kind: 'iniciacao', student: 'Fabíola da Silva Maciel', title: 'Estudo retrospectivo e prospectivo das complicações locais e/ou sistêmicas em pacientes acidentados por serpentes peçonhentas atendidos nos hospitais e clínicas especializadas da cidade de Manaus', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 1995, kind: 'iniciacao', student: 'Lilianne W. Bindá', title: 'Estudo da variação intrapopulacional dos venenos da cascavel amazônica Crotalus durissus ruruima', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 1995, kind: 'iniciacao', student: 'Janete Reis Pinheiro', title: 'Estudo da variação intrapopulacional dos venenos da cascavel amazônica Crotalus durissus ruruima', role: 'Orientadora', institution: 'Ciências Biológicas — UFAM', funding: 'CNPq' },
  { year: 1994, kind: 'iniciacao', student: 'Antônio Luiz R. Boechat', title: 'Estudo da eficácia da heparina na neutralização das principais atividades dos venenos de Bothrops atrox e Bothrops erythromelas', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 1994, kind: 'iniciacao', student: 'Cristiano S. Paiva', title: 'Estudo da eficácia da heparina na neutralização das principais atividades dos venenos de Bothrops atrox e Bothrops erythromelas', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 1994, kind: 'iniciacao', student: 'Alexandre G. Borja', title: 'Resposta imune de camundongos induzida pelos venenos de Crotalus durissus ruruima e Crotalus durissus terrificus', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 1994, kind: 'iniciacao', student: 'Augusto José Cavalcanti Neto', title: 'Verificação da eficácia das espécies vegetais com possível ação antiofídica na neutralização das principais atividades biológicas dos venenos de Crotalus durissus ruruima variedade amarela e Bothrops atrox', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 1993, kind: 'iniciacao', student: 'Ana Cláudia e Silva Barros', title: 'Determinação da toxicidade induzida pelos venenos de Crotalus durissus terrificus e Crotalus durissus ruruima variedades branca e amarela por diferentes vias de inoculação. Análise histopatológica das lesões', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },
  { year: 1993, kind: 'iniciacao', student: 'Marco Antonio Cruz Rocha', title: 'Resposta imune de camundongos induzida pelos venenos de Crotalus durissus ruruima e Crotalus durissus terrificus', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CNPq' },

  /* --------------------------------------- orientações de outra natureza */
  { year: 2018, kind: 'outra', student: 'Alessandra Encarnação de Morais', title: 'MEDensina', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2017, kind: 'outra', student: 'Thiago Soares', title: 'MEDensina', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2016, kind: 'outra', student: 'Luan Matos de Menezes', title: 'MEDensina', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2015, kind: 'outra', student: 'Bianca Gomes Wanderley', title: 'Verificar a participação de NK e linfócitos T e B após tratamento com espécies vegetais antiofídicas', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CAPES' },
  { year: 2015, kind: 'outra', student: 'Alberto Rubin Figueiredo', title: 'Verificar a participação de neutrófilos após o tratamento com espécies vegetais antiofídicas', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CAPES' },
  { year: 2015, kind: 'outra', student: 'Thiago Soares Vilas Boas', title: 'Verificar a participação de macrófagos após tratamento com espécies vegetais antiofídicas', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CAPES' },
  { year: 2012, kind: 'outra', student: 'José Dantas Goes Filho', title: 'Elaboração de projetos científicos', role: 'Orientadora', institution: 'Medicina — UFAM', funding: 'CAPES' },
  { year: 2011, kind: 'outra', student: 'Juliana de Jesus Rodrigues Ramos', title: 'MEDensina', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2011, kind: 'outra', student: 'Anderson Thiago Nobre de Camargo', title: 'MEDensina', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2011, kind: 'outra', student: 'André Ricardo Basualto Dias', title: 'MEDensina', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2011, kind: 'outra', student: 'Melina Alves da Frota', title: 'MEDensina', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2011, kind: 'outra', student: 'Larissa Andrade Figueiredo', title: 'MEDensina', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2011, kind: 'outra', student: 'Rubens Pereira Maciel', title: 'MEDensina', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2011, kind: 'outra', student: 'Camila Carvalho Gonçalves', title: 'MEDensina', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2011, kind: 'outra', student: 'Satiko Takano Peixoto', title: 'Monitoria em Imunologia', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2009, kind: 'outra', student: 'Andrey Amorim', title: 'MEDensina (projeto de Extensão)', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2009, kind: 'outra', student: 'Lorena Crispim Lopes', title: 'Monitoria em Imunologia', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2009, kind: 'outra', student: 'Rafael Oliveira Frota', title: 'Monitoria', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2009, kind: 'outra', student: 'Arthur Menezes Ribas', title: 'Monitoria', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2009, kind: 'outra', student: 'Henrique Martins dos Santos Filho', title: 'Monitoria', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2009, kind: 'outra', student: 'Renata Wanderley Nogueira', title: 'Monitoria', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2009, kind: 'outra', student: 'Thiago Andrade Ribeiro', title: 'Monitoria', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2009, kind: 'outra', student: 'Vanessa Lins de Menezes', title: 'Monitoria', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2008, kind: 'outra', student: 'Coracy Gonçalves Brasil', title: 'Monitoria em Imunologia', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2008, kind: 'outra', student: 'Bruno Corrêa Elamide', title: 'Monitoria em Imunologia', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2008, kind: 'outra', student: 'Luana Araújo de Oliveira', title: 'Monitoria em Imunologia', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2008, kind: 'outra', student: 'Sarah Abrahim', title: 'Monitoria em Imunologia', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2008, kind: 'outra', student: 'Anne Elise Cruz Chaves', title: 'Monitoria em Imunologia', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2007, kind: 'outra', student: 'Clarissa Santana Cruz', title: 'MEDensina', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2007, kind: 'outra', student: 'Joice Fernandes', title: 'Monitoria em Imunologia', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2006, kind: 'outra', student: 'Leilan de Souza Amorim', title: 'Monitoria em Imunologia', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2006, kind: 'outra', student: 'Caren Ishikawa', title: 'Monitoria em Imunologia', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2005, kind: 'outra', student: 'Cyntia Pinheiro', title: 'MED-ensina', role: 'Orientadora', institution: 'UFAM' },
  { year: 2004, kind: 'outra', student: 'Ronaldo Vitoriano Bastos', title: 'Resíduos Sólidos como fonte de renda para as comunidades vizinhas ao campus da UFAM — Etapa: Bairro do Coroado', role: 'Orientadora', institution: 'Ciências Biológicas — UFAM' },
  { year: 2003, kind: 'outra', student: 'Ellen Kathilen Rabelo Lima', title: 'Implantação da Coleta de Resíduos Sólidos na UFAM', role: 'Orientadora', institution: 'Ciências Biológicas — UFAM' },
  { year: 2003, kind: 'outra', student: 'Cláudia Saldanha de Oliveira Topan', title: 'Implantação da Coleta Seletiva na Universidade Federal do Amazonas', role: 'Orientadora', institution: 'Ciências Biológicas — UFAM' },
  { year: 2003, kind: 'outra', student: 'Julia Beatriz Coelho', title: 'MED-ensina', role: 'Orientadora', institution: 'Medicina — UFAM' },
  { year: 2015, kind: 'outra', student: 'Rômulo Vitoriano da Costa', title: 'MEDensina', role: 'Orientadora', institution: 'Odontologia — UFAM' },
];

module.exports = { ORIENTACOES };
