'use strict';

/* =========================================================================
   Recordações — o álbum da página /recordacoes.

   As fotos ficam em public/album/. Para mudar uma legenda, edite o
   campo "legenda" aqui embaixo; para tirar uma foto do ar, apague a linha
   dela (e o arquivo). "alt" é a descrição lida por leitores de tela.

   As legendas descrevem só o que a foto mostra. Nomes de pessoas, lugares e
   ocasiões ficam por conta de quem viveu a cena — é só completar.
   ========================================================================= */

const ALBUNS = [
  {
    titulo: 'Os anos 1990',
    texto: 'Fotos de papel, com a data carimbada no canto: a bancada, os colegas, os primeiros congressos.',
    fotos: [
      { arquivo: 'bancada-anos-90', l: 1125, a: 1280, legenda: 'Na bancada, a quatro mãos.', alt: 'Duas pessoas de jaleco e luvas manuseiam um camundongo no laboratório' },
      { arquivo: 'grupo-1995', l: 1280, a: 876, legenda: '10 de março de 1995 — todas as mãos sobre a pilha de volumes.', alt: 'Seis jovens em volta de uma mesa, com as mãos estendidas sobre uma pilha de volumes cor-de-rosa' },
      { arquivo: 'amigos-1994', l: 1280, a: 746, legenda: '22 de outubro de 1994.', alt: 'Dois rapazes sentados lado a lado, um deles sorrindo para a câmera' },
      { arquivo: 'sorriso-1996', l: 910, a: 1280, legenda: '21 de maio de 1996 — entre pilhas de papel e uma tesoura.', alt: 'Jovem de óculos ri debruçada sobre uma mesa com pilhas de folhas impressas' },
      { arquivo: 'poster-em-congresso', l: 909, a: 1280, legenda: 'Ao lado do pôster, em congresso.', alt: 'Rapaz de óculos posa ao lado de um painel científico com a ilustração de uma serpente' },
    ],
  },
  {
    titulo: 'Pelos ares',
    texto: 'Na Amazônia, muita viagem de trabalho começa numa pista de pouso.',
    fotos: [
      { arquivo: 'dentro-do-aviao', l: 1280, a: 963, legenda: 'A equipe a bordo do avião de transporte.', alt: 'Grupo de pessoas sentadas em bancos laterais dentro de um avião de carga' },
      { arquivo: 'equipe-e-tripulacao', l: 1280, a: 806, legenda: 'Equipe e tripulação, em terra.', alt: 'Grupo de jovens e militares posa em frente a uma lanchonete de parede azul' },
      { arquivo: 'cabine-do-aviao', l: 1280, a: 854, legenda: 'Na cabine: carta de navegação numa mão, cafezinho na outra.', alt: 'Dois tripulantes na cabine de um avião; um deles segura um mapa e um copinho de café' },
      { arquivo: 'piloto-na-cabine', l: 1280, a: 896, legenda: 'Na cabine, de fones.', alt: 'Tripulante com fones de ouvido olha para trás, diante do painel de instrumentos' },
      { arquivo: 'cabine-em-voo', l: 1280, a: 765, legenda: 'Em voo, acima das nuvens.', alt: 'Dois tripulantes na cabine de um avião em voo, com nuvens ao fundo' },
      { arquivo: 'retrato-com-quadro-de-aviao', l: 811, a: 1280, legenda: 'Diante da pintura de um hidroavião.', alt: 'Homem de farda camuflada, braços cruzados, sob o quadro de um hidroavião' },
      { arquivo: 'retrato-de-farda', l: 960, a: 1280, legenda: 'De farda.', alt: 'Homem de farda camuflada em pé ao lado de um vaso com planta' },
    ],
  },
  {
    titulo: 'Laboratório e equipe',
    texto: 'Quem passou pela bancada, pelos pôsteres e pelas defesas.',
    fotos: [
      { arquivo: 'equipe-do-laboratorio', l: 1280, a: 1280, legenda: 'A equipe reunida no laboratório.', alt: 'Dez pessoas sorriem para a foto dentro de um laboratório' },
      { arquivo: 'dia-de-laboratorio', l: 1280, a: 960, legenda: 'Um dia comum: pipeta, placas e computadores.', alt: 'Seis pessoas trabalham em bancadas e numa mesa redonda de um laboratório' },
      { arquivo: 'poster-aniba-fragrans', l: 1280, a: 960, legenda: 'Pôster sobre o potencial antiofídico de extratos de Aniba fragrans contra o veneno de Bothrops atrox, no Simpósio Municipal de Plantas Medicinais e Fitoterápicos, na UFAM.', alt: 'Duas mulheres sorriem abraçadas ao lado de um pôster científico' },
      { arquivo: 'sala-limpa', l: 1280, a: 720, legenda: 'Paramentadas para a sala limpa.', alt: 'Três pessoas de capuz verde e máscara cirúrgica fazem uma selfie' },
      { arquivo: 'memorial', l: 1280, a: 960, legenda: 'Apresentação do Memorial.', alt: 'Apresentação em sala de aula, com o slide “Memorial — Maria Cristina dos Santos” projetado' },
    ],
  },
  {
    titulo: 'Amazônia de perto',
    texto: 'Rios, céus, frutos — e o cauixi, a esponja de água doce que aparece nos galhos quando o rio baixa.',
    fotos: [
      { arquivo: 'por-do-sol-no-rio', l: 1280, a: 960, legenda: 'Pôr do sol na cheia.', alt: 'Sol se pondo sobre um rio, com árvores em silhueta na margem alagada' },
      { arquivo: 'cauixi-no-galho', l: 960, a: 1280, legenda: 'Cauixi: esponja de água doce presa a um galho, exposta na seca.', alt: 'Esponja de água doce seca, clara e espinhosa, agarrada a um galho sobre a areia' },
      { arquivo: 'cauixi-de-perto', l: 960, a: 1280, legenda: 'De perto, a trama de espículas do cauixi.', alt: 'Detalhe da superfície de uma esponja de água doce, formada por uma trama de espículas' },
      { arquivo: 'encontro-de-aguas', l: 1280, a: 960, legenda: 'Onde a água barrenta encontra a água escura.', alt: 'Faixa de água marrom-clara ao lado de água escura, sem se misturar' },
      { arquivo: 'praia-de-agua-preta', l: 1280, a: 960, legenda: 'Água cor de chá numa praia de rio.', alt: 'Margem de rio de água escura e avermelhada, com areia clara e mata' },
      { arquivo: 'nuvem-de-chuva-no-rio', l: 1280, a: 960, legenda: 'Uma nuvem de chuva, sozinha, sobre o rio.', alt: 'Grande nuvem de tempestade rosada pelo entardecer sobre um rio largo' },
      { arquivo: 'praia-ao-entardecer', l: 1280, a: 960, legenda: 'Fim de tarde na praia do rio.', alt: 'Calçadão e praia de rio ao entardecer, com céu alaranjado' },
      { arquivo: 'ouricos-de-castanha', l: 960, a: 1280, legenda: 'Ouriços de castanha-do-brasil, abertos.', alt: 'Ouriços de castanha abertos sobre uma mesa azul, com castanhas e cascas ao redor' },
      { arquivo: 'cachos-de-pupunha', l: 1280, a: 960, legenda: 'Cachos de pupunha.', alt: 'Cachos de pupunha vermelhos, laranja, amarelos e verdes amontoados' },
      { arquivo: 'folha-gigante', l: 1280, a: 960, legenda: 'Uma folha do tamanho de gente.', alt: 'Mulher sorridente segura uma folha seca enorme, que a cobre do peito aos joelhos' },
      { arquivo: 'selfie-com-tucano', l: 1280, a: 961, legenda: 'Selfie com o tucano.', alt: 'Duas mulheres sorriem numa selfie em frente a um grande tucano de madeira pintada' },
    ],
  },
];

const total = ALBUNS.reduce((n, a) => n + a.fotos.length, 0);

module.exports = { ALBUNS, total };
