'use strict';

/**
 * Camada "inteligente" do administrador.
 *
 * Tudo aqui funciona sem internet e sem chave de API: resumo automático,
 * sugestão de tags/categoria, tempo de leitura, legibilidade, auditoria de SEO
 * e detecção de spam nos comentários. A integração opcional com a API da
 * Claude (src/ai.js) apenas refina esses resultados quando está configurada.
 */

/* ------------------------------------------------------------ vocabulário */

const STOPWORDS = new Set(
  `a as o os um uma uns umas de do da dos das em no na nos nas por para com sem sob sobre
   entre até após ante contra desde perante e ou mas porém contudo todavia entretanto que
   se como quando onde qual quais quem cujo cuja é são foi foram ser estar está estão era
   eram tem têm ter há havia seu sua seus suas meu minha nosso nossa este esta esse essa
   aquele aquela isto isso aquilo ao aos à às pelo pela pelos pelas mais menos muito pouco
   também já ainda apenas então assim pois porque qualquer cada todo toda todos todas outro
   outra ne nao não sim ele ela eles elas eu tu você vocês nós lhe lhes me te se dele dela
   deles delas num numa dum duma ainda depois antes durante pode podem foi vai vão dois duas
   três primeiro segundo etc ex figura tabela et al`
    .split(/\s+/)
    .filter(Boolean),
);

/** Termos do campo de atuação da pesquisadora, usados para sugerir tags. */
const LEXICO = {
  Imunologia: [
    'imunologia',
    'imune',
    'imunidade',
    'anticorpo',
    'anticorpos',
    'imunoglobulina',
    'imunoglobulinas',
    'linfócito',
    'linfócitos',
    'citocina',
    'citocinas',
    'antígeno',
    'macrófago',
    'inflamação',
    'inflamatória',
    'igg',
    'iga',
    'igm',
    'elisa',
  ],
  'Animais peçonhentos': [
    'veneno',
    'venenos',
    'peçonha',
    'peçonhento',
    'peçonhentos',
    'serpente',
    'serpentes',
    'cobra',
    'bothrops',
    'crotalus',
    'micrurus',
    'lachesis',
    'jararaca',
    'cascavel',
    'escorpião',
    'aranha',
    'ofídico',
    'ofidismo',
    'acidente',
    'acidentes',
  ],
  Antivenenos: [
    'antiveneno',
    'antivenenos',
    'soro',
    'soroterapia',
    'antiofídico',
    'neutralização',
    'neutralizante',
    'imunização',
    'hiperimune',
  ],
  'Arraias e peixes': [
    'arraia',
    'arraias',
    'potamotrygon',
    'plesiotrygon',
    'tambaqui',
    'pirarucu',
    'colossoma',
    'peixe',
    'peixes',
    'ferrão',
    'muco',
  ],
  'Plantas medicinais': [
    'planta',
    'plantas',
    'vegetal',
    'vegetais',
    'extrato',
    'extratos',
    'fitoterápico',
    'fitoterapia',
    'etnofarmacologia',
    'bellucia',
    'peltodon',
    'brosimum',
    'medicinal',
    'medicinais',
  ],
  Psiconeuroimunologia: [
    'psiconeuroimunologia',
    'estresse',
    'stress',
    'saliva',
    'salivar',
    'cortisol',
    'ansiedade',
    'depressão',
    'burnout',
  ],
  'Doenças autoimunes': [
    'autoimune',
    'autoimunes',
    'autoimunidade',
    'lúpus',
    'artrite',
    'reumatoide',
    'reumatóide',
    'hanseníase',
    'antifosfolípide',
  ],
  Amazônia: [
    'amazônia',
    'amazônica',
    'amazonas',
    'manaus',
    'ufam',
    'ribeirinha',
    'ribeirinhos',
    'floresta',
    'igarapé',
  ],
  'Educação e divulgação': [
    'ensino',
    'educação',
    'extensão',
    'medensina',
    'estudante',
    'estudantes',
    'escola',
    'divulgação',
    'palestra',
    'oficina',
  ],
  'Saúde pública': [
    'saúde',
    'epidemiologia',
    'epidemiológico',
    'notificação',
    'sus',
    'paciente',
    'pacientes',
    'tratamento',
    'diagnóstico',
    'vacina',
    'vacinação',
  ],
};

/* ---------------------------------------------------------------- helpers */

function stripMarkdown(md = '') {
  return String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    // corta no último hífen para não partir uma palavra ao meio
    .replace(/^(.{0,80})(-.*)?$/s, '$1')
    .replace(/^-|-$/g, '');
}

function words(text) {
  return stripMarkdown(text)
    .toLowerCase()
    .normalize('NFC')
    .split(/[^a-zà-ÿ0-9-]+/i)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function sentences(text) {
  return stripMarkdown(text)
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

function countSyllables(word) {
  const groups = word.toLowerCase().match(/[aeiouáéíóúâêôãõà]+/g);
  return groups ? groups.length : 1;
}

/* -------------------------------------------------------- leitura e nível */

function readingStats(md = '') {
  const plain = stripMarkdown(md);
  const allWords = plain.split(/\s+/).filter(Boolean);
  const sents = sentences(md);
  const wordCount = allWords.length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  let flesch = null;
  if (wordCount > 30 && sents.length > 0) {
    const syllables = allWords.reduce((sum, w) => sum + countSyllables(w), 0);
    // Índice Flesch adaptado ao português (Martins et al., 1996)
    flesch =
      248.835 - 1.015 * (wordCount / sents.length) - 84.6 * (syllables / wordCount);
    flesch = Math.max(0, Math.min(100, Math.round(flesch)));
  }

  let level = 'indefinido';
  if (flesch !== null) {
    if (flesch >= 75) level = 'muito fácil';
    else if (flesch >= 50) level = 'fácil';
    else if (flesch >= 25) level = 'difícil';
    else level = 'muito difícil';
  }

  return {
    wordCount,
    readingTime,
    sentenceCount: sents.length,
    avgSentence: sents.length ? Math.round(wordCount / sents.length) : 0,
    flesch,
    level,
  };
}

/* --------------------------------------------------------------- resumo   */

/** Resumo extrativo: escolhe as frases com maior densidade de termos-chave. */
function summarize(md = '', maxChars = 260) {
  const sents = sentences(md);
  if (!sents.length) return stripMarkdown(md).slice(0, maxChars);

  const freq = new Map();
  for (const w of words(md)) freq.set(w, (freq.get(w) || 0) + 1);

  const scored = sents.map((s, i) => {
    const ws = words(s);
    const score =
      ws.reduce((sum, w) => sum + (freq.get(w) || 0), 0) / (ws.length || 1) +
      (i === 0 ? 1.5 : 0) + // a primeira frase costuma apresentar o tema
      (i < 3 ? 0.4 : 0);
    return { s, score, i };
  });

  scored.sort((a, b) => b.score - a.score);

  const chosen = [];
  let length = 0;
  for (const item of scored) {
    if (length + item.s.length > maxChars && chosen.length) break;
    chosen.push(item);
    length += item.s.length + 1;
    if (length >= maxChars) break;
  }
  chosen.sort((a, b) => a.i - b.i);

  let out = chosen.map((c) => c.s).join(' ');
  if (out.length > maxChars) out = out.slice(0, maxChars - 1).replace(/\s\S*$/, '') + '…';
  return out;
}

/* ------------------------------------------------------- tags e categoria */

function suggestTags(text = '', limit = 6) {
  const ws = words(text);
  if (!ws.length) return [];
  const bag = new Set(ws);

  // 1) temas do léxico da área
  const themed = [];
  for (const [tema, termos] of Object.entries(LEXICO)) {
    let hits = 0;
    for (const t of termos) if (bag.has(t)) hits += 1;
    if (hits >= 2 || (hits === 1 && termos.length <= 8)) themed.push({ tag: tema, hits });
  }
  themed.sort((a, b) => b.hits - a.hits);

  // 2) termos frequentes que não são do léxico (nomes de espécies, métodos…)
  const freq = new Map();
  for (const w of ws) freq.set(w, (freq.get(w) || 0) + 1);
  const generic = [...freq.entries()]
    .filter(([w, n]) => n >= 3 && w.length > 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

  const out = [];
  for (const t of themed.map((t) => t.tag).concat(generic)) {
    if (out.length >= limit) break;
    if (!out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out;
}

function suggestCategory(text = '', categories = []) {
  const bag = new Set(words(text));
  let best = null;
  for (const cat of categories) {
    const termos = words(`${cat.name} ${cat.description || ''}`);
    let hits = 0;
    for (const t of termos) if (bag.has(t)) hits += 1;
    // reforça com o léxico temático
    for (const [tema, lista] of Object.entries(LEXICO)) {
      if (slugify(tema) === cat.slug || cat.name.toLowerCase().includes(tema.toLowerCase())) {
        for (const t of lista) if (bag.has(t)) hits += 1;
      }
    }
    if (hits > 0 && (!best || hits > best.hits)) best = { id: cat.id, name: cat.name, hits };
  }
  return best;
}

/* ------------------------------------------------------------- auditoria  */

/**
 * Checklist editorial/SEO do post. Retorna itens com nível
 * `ok` | `aviso` | `erro` e uma nota de 0 a 100.
 */
/**
 * Palavras que o projeto escreve sempre com inicial maiúscula.
 * Devolve as que aparecem em minúscula no texto (fora de endereços e de código).
 */
const GRAFIA_MAIUSCULA = ['Imunologia'];

function grafiaDaCasa(texto = '') {
  const limpo = texto
    .replace(/```[\s\S]*?```/g, ' ')          // blocos de código
    .replace(/`[^`]*`/g, ' ')                  // código curto
    .replace(/\]\([^)]*\)/g, '] ')             // destino dos links
    .replace(/https?:\/\/\S+/g, ' ');          // endereços soltos

  return GRAFIA_MAIUSCULA.filter((palavra) => {
    const re = new RegExp(`(?<![\\p{L}\\p{N}_-])${palavra.toLowerCase()}(?![\\p{L}\\p{N}_-])`, 'u');
    return re.test(limpo);
  });
}

function auditPost(post = {}) {
  const items = [];
  const add = (level, label, hint = '') => items.push({ level, label, hint });

  const title = (post.title || '').trim();
  if (!title) add('erro', 'O post precisa de um título.');
  else if (title.length < 20)
    add('aviso', 'Título curto', 'Entre 30 e 70 caracteres funciona melhor nas buscas.');
  else if (title.length > 80)
    add('aviso', 'Título longo', 'Acima de 70 caracteres o Google costuma cortar.');
  else add('ok', 'Título com bom tamanho.');

  const excerpt = (post.excerpt || '').trim();
  if (!excerpt) add('aviso', 'Sem resumo', 'Use o botão "Gerar resumo" para criar um.');
  else if (excerpt.length < 80) add('aviso', 'Resumo muito curto.');
  else add('ok', 'Resumo preenchido.');

  const stats = readingStats(post.body_md || '');
  if (stats.wordCount < 120)
    add('aviso', `Texto curto (${stats.wordCount} palavras)`, 'Posts com 300+ palavras rendem mais.');
  else add('ok', `${stats.wordCount} palavras · ${stats.readingTime} min de leitura.`);

  if (stats.flesch !== null && stats.flesch < 25)
    add(
      'aviso',
      `Leitura ${stats.level}`,
      'Frases mais curtas ajudam quem não é da área a acompanhar.',
    );
  else if (stats.flesch !== null) add('ok', `Legibilidade: ${stats.level}.`);

  if (!post.cover)
    add('erro', 'Sem imagem de capa', 'Todo post do blog precisa de uma capa — escolha uma na galeria.');
  else add('ok', 'Imagem de capa definida.');

  if (!post.galleryCount)
    add('aviso', 'Sem fotos anexadas', 'Uma ou duas fotos com legenda ajudam muito quem lê.');
  else add('ok', `${post.galleryCount} foto(s) na galeria do post.`);

  if (!post.category_id) add('aviso', 'Sem categoria definida.');
  else add('ok', 'Categoria definida.');

  if (!post.tagCount) add('aviso', 'Sem tags', 'Duas ou três tags já ajudam na navegação.');
  else add('ok', `${post.tagCount} tag(s).`);

  const md = post.body_md || '';
  if (md && !/^##\s/m.test(md) && stats.wordCount > 400)
    add('aviso', 'Sem subtítulos', 'Divida textos longos com "## Subtítulo".');
  else if (md) add('ok', 'Estrutura do texto adequada.');

  if (post.source_url && !post.source_title)
    add('aviso', 'Fonte sem título', 'Dê um nome à fonte para a citação ficar completa.');
  if (post.source_url) add('ok', 'Fonte externa creditada.');

  // "Imunologia" sempre com maiúscula — regra de estilo do projeto.
  const caixa = grafiaDaCasa(
    [post.title, post.subtitle, post.excerpt, post.body_md].filter(Boolean).join('\n'),
  );
  if (caixa.length)
    add(
      'aviso',
      `Escreva com maiúscula: ${caixa.join(', ')}`,
      'É a grafia adotada no site inteiro.',
    );

  const erros = items.filter((i) => i.level === 'erro').length;
  const avisos = items.filter((i) => i.level === 'aviso').length;
  const score = Math.max(0, 100 - erros * 30 - avisos * 8);

  return { items, score, stats };
}

/* ------------------------------------------------------------------ spam  */

const SPAM_TERMS = [
  'viagra',
  'cialis',
  'casino',
  'bet365',
  'apostas',
  'crypto',
  'bitcoin',
  'forex',
  'seo services',
  'buy now',
  'click here',
  'porn',
  'xxx',
  'emagrecer',
  'ganhe dinheiro',
  'renda extra',
  'clique aqui',
  'promoção imperdível',
];

/**
 * Pontua um comentário de 0 (limpo) a 100 (spam evidente).
 * >= 60 vira spam automaticamente; 30–59 vai para moderação com alerta.
 */
function spamScore(comment = {}) {
  const body = String(comment.body || '');
  const name = String(comment.author_name || '');
  const reasons = [];
  let score = 0;

  const links = (body.match(/https?:\/\//gi) || []).length;
  if (links >= 3) {
    score += 45;
    reasons.push(`${links} links`);
  } else if (links === 2) {
    score += 20;
    reasons.push('2 links');
  } else if (links === 1) {
    score += 6;
  }

  const lower = `${body} ${name}`.toLowerCase();
  const hits = SPAM_TERMS.filter((t) => lower.includes(t));
  if (hits.length) {
    score += 25 * hits.length;
    reasons.push(`termos suspeitos: ${hits.slice(0, 3).join(', ')}`);
  }

  const letters = body.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (letters.length > 20) {
    const caps = (body.match(/[A-ZÀ-Ý]/g) || []).length / letters.length;
    if (caps > 0.6) {
      score += 18;
      reasons.push('excesso de maiúsculas');
    }
  }

  if (/(.)\1{6,}/.test(body)) {
    score += 15;
    reasons.push('caracteres repetidos');
  }

  if (body.trim().length < 8) {
    score += 12;
    reasons.push('comentário muito curto');
  }

  if (/\[url=|<a\s+href/i.test(body)) {
    score += 30;
    reasons.push('marcação de link embutida');
  }

  if (comment.author_site && !/^https?:\/\//i.test(comment.author_site)) {
    score += 5;
  }

  if (comment.elapsedMs !== undefined && comment.elapsedMs < 3000) {
    score += 20;
    reasons.push('enviado rápido demais (provável robô)');
  }

  if (comment.honeypot) {
    score = 100;
    reasons.push('campo-armadilha preenchido');
  }

  return { score: Math.min(100, score), reasons: reasons.join('; ') };
}

/* ------------------------------------------------------------- citações   */

/** Monta uma citação legível a partir da fonte informada no post. */
function buildCitation({ source_title, source_url, doi, authors, year }) {
  const parts = [];
  if (authors) parts.push(authors);
  if (year) parts.push(`(${year})`);
  if (source_title) parts.push(`${source_title}.`);
  if (doi) parts.push(`https://doi.org/${String(doi).replace(/^https?:\/\/doi\.org\//, '')}`);
  else if (source_url) parts.push(source_url);
  return parts.join(' ').trim();
}

/* ------------------------------------------------------- pauta / ideias   */

/**
 * Sugere próximos assuntos a partir do que já foi publicado:
 * tags usadas há mais tempo e categorias sem posts recentes.
 */
function suggestTopics({ tags = [], categories = [], recentTitles = [] }) {
  const ideas = [];
  const usados = new Set(recentTitles.map((t) => t.toLowerCase()));

  for (const c of categories.filter((c) => !c.recent)) {
    ideas.push({
      kind: 'categoria',
      text: `A categoria “${c.name}” está sem publicações recentes — que tal retomar?`,
    });
  }
  for (const t of tags.slice(0, 4)) {
    const sugestao = `Atualização sobre ${t.name}: o que mudou nos últimos anos`;
    if (!usados.has(sugestao.toLowerCase()))
      ideas.push({ kind: 'tag', text: sugestao });
  }
  ideas.push({
    kind: 'sazonal',
    text: 'Período de cheia dos rios: alerta sobre acidentes com arraias e primeiros socorros.',
  });
  ideas.push({
    kind: 'divulgação',
    text: 'Comentar um artigo recente que você leu e explicar por que ele importa para a Amazônia.',
  });
  return ideas.slice(0, 6);
}

module.exports = {
  STOPWORDS,
  LEXICO,
  stripMarkdown,
  slugify,
  words,
  sentences,
  readingStats,
  summarize,
  suggestTags,
  suggestCategory,
  auditPost,
  spamScore,
  buildCitation,
  suggestTopics,
};
