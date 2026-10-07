'use strict';

const { marked } = require('marked');

marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: false,
  mangle: false,
});

/* ----------------------------------------------------------- figuras ----
   Uma imagem sozinha num parágrafo vira <figure> com legenda e crédito:

     ![descrição da imagem](/uploads/foto.jpg "Legenda da foto | Crédito")

   O texto entre aspas é a legenda; depois de "|" vem o crédito. Os dois
   são opcionais. A descrição (alt) continua servindo a quem usa leitor de
   tela e não aparece na página.                                            */

function figura(src, alt, titulo) {
  const [legenda = '', credito = ''] = String(titulo || '').split('|').map((s) => s.trim());
  const img = `<img src="${src}" alt="${alt}" loading="lazy" decoding="async">`;
  if (!legenda && !credito) return `<figure class="figura">${img}</figure>`;
  const partes = [];
  if (legenda) partes.push(legenda);
  if (credito) partes.push(`<span class="credit">${credito}</span>`);
  return `<figure class="figura">${img}<figcaption>${partes.join(' ')}</figcaption></figure>`;
}

/* ----------------------------------------------------- tipografia ------
   Aspas retas viram aspas curvas, "--" vira travessão, "..." vira
   reticências. Só em texto corrido: nada dentro de tags, código ou
   atributos.                                                               */

function tipografia(texto) {
  // o marked entrega aspas e apóstrofos já escapados (&quot; e &#39;)
  return texto
    .replace(/(^|[\s(\[{>—–-])(?:"|&quot;)(?=\S)/g, '$1“')
    .replace(/"|&quot;/g, '”')
    .replace(/(^|[\s(\[{>—–-])(?:'|&#39;)(?=\S)/g, '$1‘')
    .replace(/'|&#39;/g, '’')
    .replace(/\s--\s/g, ' — ')
    .replace(/(\S)--(\S)/g, '$1—$2')
    .replace(/\.\.\./g, '…');
}

function aplicarTipografia(html) {
  // fatia por tags; pula o conteúdo de <code>, <pre>, <script> e <style>
  const partes = html.split(/(<[^>]+>)/);
  let bloqueado = 0;
  return partes
    .map((parte) => {
      if (parte.startsWith('<')) {
        if (/^<(code|pre|script|style|kbd|samp)\b/i.test(parte)) bloqueado += 1;
        else if (/^<\/(code|pre|script|style|kbd|samp)\b/i.test(parte)) bloqueado = Math.max(0, bloqueado - 1);
        return parte;
      }
      return bloqueado ? parte : tipografia(parte);
    })
    .join('');
}

/** Converte o Markdown do post em HTML. Conteúdo do admin é confiável. */
function renderMarkdown(md = '') {
  let html = marked.parse(String(md));

  // imagem sozinha no parágrafo → figura com legenda
  html = html.replace(
    /<p>\s*<img src="([^"]*)" alt="([^"]*)"(?: title="([^"]*)")?\s*\/?>\s*<\/p>/g,
    (_, src, alt, titulo) => figura(src, alt, titulo),
  );

  // links para fora abrem em nova aba, sem vazar a origem
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');

  // âncora em cada subtítulo, para o índice lateral do post
  let i = 0;
  html = html.replace(/<h([23])>(.*?)<\/h\1>/g, (_, level, inner) => {
    i += 1;
    return `<h${level} id="sec-${i}">${inner}</h${level}>`;
  });

  return aplicarTipografia(html);
}

/** Lista os subtítulos (##, ###) para montar o índice do post. */
function outline(md = '') {
  const out = [];
  let i = 0;
  for (const line of String(md).split('\n')) {
    const m = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (m) {
      i += 1;
      out.push({ level: m[1].length, text: m[2].replace(/[*_`]/g, ''), id: `sec-${i}` });
    }
  }
  return out;
}

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Comentários: texto puro, com quebras de linha e links clicáveis seguros. */
function renderComment(text = '') {
  const safe = escapeHtml(String(text).trim());
  const linked = safe.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" rel="nofollow noopener ugc" target="_blank">$1</a>',
  );
  return linked
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

module.exports = { renderMarkdown, outline, escapeHtml, renderComment, tipografia };
