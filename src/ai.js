'use strict';

/**
 * Assistente opcional do administrador, sobre a API da Claude.
 *
 * Só entra em ação quando ANTHROPIC_API_KEY está definida no ambiente.
 * Sem chave, todas as funções devolvem `null` e o admin continua funcionando
 * com as heurísticas de src/intel.js.
 */

const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

function enabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const PERSONA = `Você é o assistente editorial da Profa. Dra. Maria Cristina dos Santos Sobreira de Sampaio
Sobreira de Sampaio — imunologista, professora titular aposentada do Instituto de Ciências
Biológicas da UFAM, pesquisadora de venenos de serpentes e arraias, antivenenos, plantas
medicinais amazônicas com ação antiofídica e psiconeuroimunologia.

Escreva sempre em português do Brasil, na primeira pessoa dela quando o texto for do blog.
Tom: rigoroso mas acessível, próximo do leitor não especialista, sem sensacionalismo.
Nunca invente dados, números, autores ou referências. Se uma informação não estiver no
texto recebido, não a acrescente.`;

function textOf(response) {
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

/** Wrapper com tratamento de erro: nunca derruba o admin. */
async function call(params) {
  const anthropic = getClient();
  if (!anthropic) return null;
  try {
    return await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: PERSONA,
      ...params,
    });
  } catch (err) {
    console.error('[ai] falha na chamada:', err?.message || err);
    return null;
  }
}

/* ------------------------------------------------------------- metadados  */

const METADATA_SCHEMA = {
  type: 'object',
  properties: {
    excerpt: {
      type: 'string',
      description: 'Resumo de 1 a 2 frases (máx. 260 caracteres) para a lista de posts.',
    },
    seo_description: {
      type: 'string',
      description: 'Descrição para buscadores, até 155 caracteres.',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'De 3 a 6 tags curtas, em português, sem repetir a categoria.',
    },
    title_suggestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Três títulos alternativos, claros e específicos.',
    },
    key_points: {
      type: 'array',
      items: { type: 'string' },
      description: 'Até 4 pontos-chave do texto, uma frase cada.',
    },
  },
  required: ['excerpt', 'seo_description', 'tags', 'title_suggestions', 'key_points'],
  additionalProperties: false,
};

/**
 * Extrai resumo, tags, descrição de SEO e sugestões de título de um rascunho.
 * @returns {Promise<object|null>}
 */
async function metadata({ title = '', body = '' }) {
  if (!body.trim()) return null;
  const response = await call({
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: METADATA_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: `Analise este rascunho de post e devolva os metadados editoriais.

Título atual: ${title || '(sem título)'}

Texto (Markdown):
"""
${body.slice(0, 40000)}
"""`,
      },
    ],
  });
  if (!response) return null;
  try {
    return JSON.parse(textOf(response));
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------- revisão  */

const MODOS = {
  revisar:
    'Revise ortografia, gramática, pontuação e concordância. Melhore a fluidez sem mudar o sentido, o tom ou a estrutura. Mantenha os termos técnicos.',
  simplificar:
    'Reescreva para um leitor sem formação científica: frases mais curtas, jargão explicado na primeira aparição, exemplos concretos. Preserve todos os fatos.',
  expandir:
    'Desenvolva o texto acrescentando contexto e explicações que já estejam implícitas no material. Não invente dados novos, nomes, números nem referências.',
  encurtar:
    'Reduza o texto em cerca de um terço, mantendo todas as informações essenciais e o tom.',
  titulos:
    'Não reescreva o texto. Proponha 6 títulos alternativos, um por linha, sem numeração.',
};

/**
 * Reescreve/revisa o corpo do post em Markdown.
 * @param {string} body      Markdown original
 * @param {keyof MODOS} mode
 */
async function rewrite(body, mode = 'revisar') {
  if (!body.trim()) return null;
  const instrucao = MODOS[mode] || MODOS.revisar;
  const response = await call({
    output_config: { effort: 'medium' },
    messages: [
      {
        role: 'user',
        content: `${instrucao}

Responda apenas com o resultado em Markdown, sem comentários seus e sem cercas de código.

"""
${body.slice(0, 40000)}
"""`,
      },
    ],
  });
  return response ? textOf(response) : null;
}

/* ------------------------------------------- comentar uma leitura externa */

/**
 * Gera um rascunho de post comentando um material que ela leu na internet.
 * @param {{url?:string, title?:string, notes?:string, excerpt?:string}} input
 */
async function draftFromSource({ url = '', title = '', notes = '', excerpt = '' }) {
  if (!title && !url && !excerpt) return null;
  const response = await call({
    output_config: { effort: 'medium' },
    messages: [
      {
        role: 'user',
        content: `Escreva um rascunho de post para o blog comentando este material que li.

Título da fonte: ${title || '(não informado)'}
Endereço: ${url || '(não informado)'}
Trecho/resumo que copiei: ${excerpt || '(nenhum)'}
Minhas anotações: ${notes || '(nenhuma)'}

Estruture assim, em Markdown:
1. Um parágrafo de abertura explicando do que trata o material e por que ele me chamou atenção.
2. Um ou dois subtítulos "##" desenvolvendo os pontos principais.
3. Um subtítulo "## O que isso significa para a Amazônia" quando fizer sentido.
4. Um parágrafo final com minha leitura crítica.

Baseie-se apenas no que foi informado acima. Onde faltar informação, escreva
"[verificar no artigo original]" em vez de supor. Não invente números nem citações.
Responda somente com o Markdown do post.`,
      },
    ],
  });
  return response ? textOf(response) : null;
}

/* ------------------------------------------------------------ comentários */

const MODERACAO_SCHEMA = {
  type: 'object',
  properties: {
    veredito: { type: 'string', enum: ['aprovar', 'revisar', 'spam'] },
    motivo: { type: 'string' },
    tom: { type: 'string', enum: ['elogio', 'dúvida', 'crítica', 'divulgação', 'outro'] },
    resposta_sugerida: {
      type: 'string',
      description: 'Rascunho curto e cordial de resposta, em primeira pessoa.',
    },
  },
  required: ['veredito', 'motivo', 'tom', 'resposta_sugerida'],
  additionalProperties: false,
};

/** Classifica um comentário e já rascunha uma resposta. */
async function reviewComment({ comment = '', author = '', postTitle = '' }) {
  if (!comment.trim()) return null;
  const response = await call({
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: MODERACAO_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: `Avalie este comentário recebido no blog.

Post: ${postTitle}
Autor: ${author}
Comentário:
"""
${comment.slice(0, 4000)}
"""

Marque como "spam" apenas propaganda, links comerciais ou texto sem relação com o post.
Marque como "revisar" se houver ofensa, desinformação de saúde ou pedido de orientação
médica individual. Caso contrário, "aprovar".`,
      },
    ],
  });
  if (!response) return null;
  try {
    return JSON.parse(textOf(response));
  } catch {
    return null;
  }
}

module.exports = {
  enabled,
  MODEL,
  metadata,
  rewrite,
  draftFromSource,
  reviewComment,
  MODOS,
};
