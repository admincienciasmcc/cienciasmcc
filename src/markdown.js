'use strict';

const { marked } = require('marked');

marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: false,
  mangle: false,
});

/** Converte o Markdown do post em HTML. Conteúdo do admin é confiável. */
function renderMarkdown(md = '') {
  const html = marked.parse(String(md));
  // dá um alvo de âncora a cada subtítulo, para o índice lateral do post
  let i = 0;
  return html.replace(/<h([23])>(.*?)<\/h\1>/g, (_, level, inner) => {
    i += 1;
    const id = `sec-${i}`;
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
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

module.exports = { renderMarkdown, outline, escapeHtml, renderComment };
