/* =========================================================================
   Editor inteligente — análise em tempo real, atalhos de Markdown,
   pré-visualização e assistente de escrita.
   ========================================================================= */
(function () {
  'use strict';

  var form = document.getElementById('post-form');
  if (!form) return initOutsideEditor();

  var $ = function (id) { return document.getElementById(id); };
  var csrf = form.querySelector('input[name=_csrf]').value;

  var title = $('title');
  var subtitle = $('subtitle');
  var body = $('body_md');
  var slug = $('slug');
  var excerpt = $('excerpt');
  var seoDesc = $('seo_description');
  var tags = $('tags');
  var cover = $('cover');
  var category = $('category_id');
  var preview = $('preview');

  var galleryList = $('gallery-list');
  var isNew = !form.querySelector('input[name=id]').value;
  var slugTouched = false;
  var lastAnalysis = null;

  /* ------------------------------------------------------------ utilidades */

  function post(url, data) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
      body: JSON.stringify(data),
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw new Error(j.erro || 'Erro'); });
      return r.json();
    });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  function slugify(text) {
    return text
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);
  }

  /* ------------------------------------------------------------- análise  */

  function payload() {
    return {
      title: title.value,
      subtitle: subtitle ? subtitle.value : '',
      body: body.value,
      excerpt: excerpt.value,
      tags: tags.value,
      cover: cover.value,
      category_id: category.value,
      source_url: ($('source_url') || {}).value || '',
      source_title: ($('source_title') || {}).value || '',
      galleryCount: galleryList ? galleryList.children.length : 0,
    };
  }

  function renderAudit(audit) {
    var num = $('score-num');
    var bar = $('score-bar');
    num.textContent = audit.score;
    bar.style.width = audit.score + '%';
    bar.style.background =
      audit.score >= 80 ? 'var(--a-green)' : audit.score >= 55 ? 'var(--a-amber)' : 'var(--a-red)';

    var list = $('audit-list');
    list.innerHTML = '';
    audit.items.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'audit-item ' + item.level;
      var dot = document.createElement('span');
      dot.className = 'dot';
      var text = document.createElement('span');
      text.textContent = item.label;
      if (item.hint) {
        var hint = document.createElement('span');
        hint.className = 'hint';
        hint.textContent = item.hint;
        text.appendChild(hint);
      }
      row.appendChild(dot);
      row.appendChild(text);
      list.appendChild(row);
    });
  }

  function renderSuggestions(data) {
    var box = $('tag-suggest');
    box.innerHTML = '';
    var current = tags.value.toLowerCase();
    var fresh = data.tags.filter(function (t) { return current.indexOf(t.toLowerCase()) === -1; });
    if (!fresh.length) {
      box.textContent = 'nada novo a sugerir';
      return;
    }
    fresh.forEach(function (t) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'suggest-chip';
      chip.textContent = '+ ' + t;
      chip.addEventListener('click', function () {
        tags.value = tags.value.trim()
          ? tags.value.replace(/,\s*$/, '') + ', ' + t
          : t;
        chip.remove();
        analyzeNow();
      });
      box.appendChild(chip);
    });

    var cat = $('cat-suggest');
    cat.innerHTML = '';
    if (data.category && !category.value) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'suggest-chip';
      b.textContent = 'Sugestão: ' + data.category.name;
      b.addEventListener('click', function () {
        category.value = data.category.id;
        cat.innerHTML = '';
        analyzeNow();
      });
      cat.appendChild(b);
    }
  }

  function analyzeNow() {
    if (!body.value.trim() && !title.value.trim()) return;
    post('/admin/api/analisar', payload())
      .then(function (data) {
        lastAnalysis = data;
        renderAudit(data.audit);
        renderSuggestions(data);
        $('text-stats').textContent =
          data.stats.wordCount + ' palavras · ' + data.stats.readingTime +
          ' min · legibilidade ' + data.stats.level;
        $('word-count').textContent = data.stats.wordCount + ' palavras';
        if (preview && !preview.hidden) preview.innerHTML = data.html;
      })
      .catch(function () { /* silencioso: a análise é auxiliar */ });
  }

  var analyzeSoon = debounce(analyzeNow, 900);

  [title, body, excerpt, tags, cover, category].forEach(function (el) {
    if (el) el.addEventListener('input', analyzeSoon);
  });
  if (category) category.addEventListener('change', analyzeNow);
  $('btn-analyze').addEventListener('click', analyzeNow);

  /* ------------------------------------------------ título, slug e SEO   */

  function updateTitleLen() {
    var n = title.value.length;
    var el = $('title-len');
    var aviso = n === 0 ? '' : n < 30 ? ' (curto)' : n > 70 ? ' (longo para o Google)' : ' ✓';
    el.textContent = n + ' caracteres' + aviso;
    el.style.color = n > 70 ? 'var(--a-amber)' : '';
  }

  title.addEventListener('input', function () {
    updateTitleLen();
    if (isNew && !slugTouched) slug.value = slugify(title.value);
  });
  slug.addEventListener('input', function () { slugTouched = true; });
  updateTitleLen();

  function updateSeoLen() {
    var n = seoDesc.value.length;
    $('seo-len').textContent = n;
    $('seo-len').style.color = n > 155 ? 'var(--a-red)' : '';
  }
  seoDesc.addEventListener('input', updateSeoLen);
  updateSeoLen();

  $('btn-summary').addEventListener('click', function () {
    post('/admin/api/analisar', payload()).then(function (data) {
      if (!excerpt.value.trim() || confirm('Substituir o resumo atual?')) {
        excerpt.value = data.excerpt;
      }
      if (!seoDesc.value.trim()) seoDesc.value = data.seo_description;
      updateSeoLen();
      analyzeNow();
    });
  });

  /* ------------------------------------------------------ barra Markdown */

  function wrap(before, after, placeholder) {
    var start = body.selectionStart;
    var end = body.selectionEnd;
    var selected = body.value.slice(start, end) || placeholder || '';
    var text = before + selected + (after === undefined ? before : after);
    body.setRangeText(text, start, end, 'end');
    if (!body.value.slice(start, end)) {
      body.selectionStart = start + before.length;
      body.selectionEnd = start + before.length + selected.length;
    }
    body.focus();
    analyzeSoon();
  }

  function prefixLines(prefix) {
    var start = body.selectionStart;
    var lineStart = body.value.lastIndexOf('\n', start - 1) + 1;
    body.setRangeText(prefix, lineStart, lineStart, 'end');
    body.focus();
    analyzeSoon();
  }

  var actions = {
    bold: function () { wrap('**', '**', 'texto'); },
    italic: function () { wrap('*', '*', 'texto'); },
    h2: function () { prefixLines('## '); },
    h3: function () { prefixLines('### '); },
    quote: function () { prefixLines('> '); },
    list: function () { prefixLines('- '); },
    link: function () {
      var url = prompt('Endereço do link:', 'https://');
      if (url) wrap('[', '](' + url + ')', 'texto do link');
    },
    image: function () { openMedia('body'); },
  };

  document.querySelectorAll('[data-md]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var fn = actions[btn.dataset.md];
      if (fn) fn();
    });
  });

  // atalhos de teclado
  body.addEventListener('keydown', function (e) {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key === 'b') { e.preventDefault(); actions.bold(); }
    if (e.key === 'i') { e.preventDefault(); actions.italic(); }
    if (e.key === 's') { e.preventDefault(); form.submit(); }
  });

  /* ------------------------------------------------------ pré-visualização */

  $('toggle-preview').addEventListener('click', function () {
    var showing = !preview.hidden;
    if (showing) {
      preview.hidden = true;
      body.hidden = false;
      this.textContent = '👁 Pré-visualizar';
    } else {
      post('/admin/api/analisar', payload()).then(function (data) {
        preview.innerHTML = data.html;
      });
      preview.hidden = false;
      body.hidden = true;
      this.textContent = '✏️ Voltar a escrever';
    }
  });

  /* ------------------------------------------ biblioteca e galeria de fotos */

  var dialog = $('media-dialog');
  var mediaTarget = 'cover';

  var DIALOG_TEXTS = {
    cover: ['Escolher a imagem de capa', 'A capa aparece no topo do post e nos cartões da listagem.'],
    gallery: ['Anexar fotos ao post', 'Clique em quantas quiser — cada uma vira uma linha com legenda e crédito.'],
    body: ['Inserir foto no meio do texto', 'A imagem é inserida na posição do cursor.'],
  };

  function openMedia(target) {
    mediaTarget = target;
    var texts = DIALOG_TEXTS[target] || DIALOG_TEXTS.cover;
    $('media-dialog-title').textContent = texts[0];
    $('media-dialog-hint').textContent = texts[1];
    if (dialog.showModal) dialog.showModal();
  }

  var pickBtn = $('btn-pick-cover');
  if (pickBtn) pickBtn.addEventListener('click', function () { openMedia('cover'); });

  var addGalleryBtn = $('btn-add-gallery');
  if (addGalleryBtn) addGalleryBtn.addEventListener('click', function () { openMedia('gallery'); });

  document.querySelectorAll('.media-pick').forEach(function (item) {
    item.addEventListener('click', function () {
      var src = item.dataset.src;
      var alt = item.dataset.alt || '';
      var credit = item.dataset.credit || '';

      if (mediaTarget === 'cover') {
        cover.value = src;
        renderCoverPreview();
        var creditField = $('cover_credit');
        if (credit && creditField && !creditField.value.trim()) creditField.value = credit;
        dialog.close();
      } else if (mediaTarget === 'gallery') {
        addGalleryRow({ url: src, caption: alt, credit: credit });
        // não fecha: ela pode escolher várias fotos seguidas
        item.style.outline = '3px solid var(--a-green)';
        setTimeout(function () { item.style.outline = ''; }, 600);
      } else {
        var start = body.selectionStart;
        body.setRangeText('\n![' + alt + '](' + src + ')\n', start, start, 'end');
        dialog.close();
      }
      analyzeNow();
    });
  });

  function renderCoverPreview() {
    $('cover-preview').innerHTML = cover.value
      ? '<img src="' + cover.value.replace(/"/g, '&quot;') + '" alt="" style="border-radius:8px">'
      : '';
  }
  cover.addEventListener('input', renderCoverPreview);

  /* -------------------------------------------- linhas da galeria do post */

  var galleryTemplate = $('gallery-row-template');

  function updateGalleryState() {
    var n = galleryList ? galleryList.children.length : 0;
    var counter = $('gallery-count');
    var empty = $('gallery-empty');
    if (counter) counter.textContent = n === 0 ? '' : n + (n === 1 ? ' foto' : ' fotos');
    if (empty) empty.hidden = n > 0;
  }

  function addGalleryRow(data) {
    if (!galleryList || !galleryTemplate) return;
    var row = galleryTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('.gal-thumb').src = data.url;
    row.querySelector('.gal-thumb').alt = data.caption || '';
    row.querySelector('input[name="gallery_url[]"]').value = data.url;
    row.querySelector('input[name="gallery_caption[]"]').value = data.caption || '';
    row.querySelector('input[name="gallery_credit[]"]').value = data.credit || '';

    row.querySelector('[data-gal=remove]').addEventListener('click', function () {
      row.remove();
      updateGalleryState();
    });
    row.querySelector('[data-gal=up]').addEventListener('click', function () {
      if (row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
    });
    row.querySelector('[data-gal=down]').addEventListener('click', function () {
      if (row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
    });

    galleryList.appendChild(row);
    updateGalleryState();
  }

  // carrega as fotos já anexadas ao post
  var galleryData = $('gallery-data');
  if (galleryData) {
    try {
      JSON.parse(galleryData.textContent || '[]').forEach(addGalleryRow);
    } catch (e) { /* galeria vazia */ }
  }
  updateGalleryState();

  /* -------------------------------------------------------- assistente IA */

  function aiStatus(msg, busy) {
    var el = $('ai-status');
    if (!el) return;
    el.innerHTML = busy ? '<span class="spinner"></span> ' + msg : msg;
  }

  document.querySelectorAll('[data-ai]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var modo = btn.dataset.ai;
      if (!body.value.trim()) return aiStatus('Escreva algo primeiro.');
      if (!confirm('O texto atual será substituído pela versão revisada. Continuar?')) return;

      var original = body.value;
      aiStatus('Trabalhando no texto…', true);
      btn.disabled = true;

      post('/admin/api/ia/reescrever', { body: original, modo: modo })
        .then(function (data) {
          body.value = data.texto;
          aiStatus('Pronto. <button type="button" class="btn btn-ghost btn-sm" id="undo-ai">desfazer</button>');
          $('undo-ai').addEventListener('click', function () {
            body.value = original;
            aiStatus('Texto original restaurado.');
            analyzeNow();
          });
          analyzeNow();
        })
        .catch(function (err) { aiStatus('⚠️ ' + err.message); })
        .finally(function () { btn.disabled = false; });
    });
  });

  var metaBtn = $('btn-ai-meta');
  if (metaBtn) {
    metaBtn.addEventListener('click', function () {
      if (!body.value.trim()) return aiStatus('Escreva algo primeiro.');
      aiStatus('Analisando…', true);
      metaBtn.disabled = true;

      post('/admin/api/ia/metadados', { title: title.value, body: body.value })
        .then(function (data) {
          if (data.excerpt) excerpt.value = data.excerpt;
          if (data.seo_description) seoDesc.value = data.seo_description;
          if (data.tags && data.tags.length) tags.value = data.tags.join(', ');
          updateSeoLen();

          var box = $('ai-titles');
          box.innerHTML = '<div class="small muted" style="margin-bottom:.3rem">Títulos sugeridos:</div>';
          (data.title_suggestions || []).forEach(function (t) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'suggest-chip';
            b.style.marginBottom = '.25rem';
            b.textContent = t;
            b.addEventListener('click', function () {
              title.value = t;
              updateTitleLen();
              if (isNew && !slugTouched) slug.value = slugify(t);
              analyzeNow();
            });
            box.appendChild(b);
          });
          aiStatus('Resumo, tags e títulos atualizados.');
          analyzeNow();
        })
        .catch(function (err) { aiStatus('⚠️ ' + err.message); })
        .finally(function () { metaBtn.disabled = false; });
    });
  }

  var draftBtn = $('btn-draft');
  if (draftBtn) {
    draftBtn.addEventListener('click', function () {
      var src = {
        url: $('source_url').value,
        title: $('source_title').value,
        notes: ($('ai-notes') || {}).value || '',
      };
      if (!src.url && !src.title) {
        $('draft-status').textContent = 'Informe ao menos o título ou o link da fonte.';
        return;
      }
      if (body.value.trim() && !confirm('Isso substitui o texto atual. Continuar?')) return;

      $('draft-status').innerHTML = '<span class="spinner"></span> escrevendo…';
      draftBtn.disabled = true;

      post('/admin/api/ia/rascunho', src)
        .then(function (data) {
          body.value = data.texto;
          $('draft-status').textContent = 'Rascunho pronto — revise com atenção.';
          analyzeNow();
        })
        .catch(function (err) { $('draft-status').textContent = '⚠️ ' + err.message; })
        .finally(function () { draftBtn.disabled = false; });
    });
  }

  /* --------------------------------------------------- avisos de saída   */

  var dirty = false;
  form.addEventListener('input', function () { dirty = true; });
  form.addEventListener('submit', function () { dirty = false; });
  window.addEventListener('beforeunload', function (e) {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  analyzeNow();

  /* ==================================================================== */

  function initOutsideEditor() {}
})();

/* ------------------------------------------------- páginas fora do editor */
(function () {
  'use strict';

  // análise de comentário sob demanda
  document.querySelectorAll('[data-analyze-comment]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.analyzeComment;
      var out = document.getElementById('analysis-' + id);
      var csrf = document.querySelector('input[name=_csrf]').value;
      out.innerHTML = '<span class="spinner"></span> analisando…';

      fetch('/admin/api/comentario/' + id + '/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: '{}',
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var html = '<div class="small"><b>Heurística:</b> risco ' + data.heuristica.score + '%';
          if (data.heuristica.reasons) html += ' — ' + data.heuristica.reasons;
          html += '</div>';
          if (data.ia) {
            html +=
              '<div class="small" style="margin-top:.4rem"><b>Assistente:</b> ' +
              data.ia.veredito + ' (' + data.ia.tom + ') — ' + data.ia.motivo + '</div>';
            if (data.ia.resposta_sugerida) {
              html +=
                '<div class="field" style="margin-top:.5rem"><label>Resposta sugerida</label>' +
                '<textarea rows="3" data-fill-reply="' + id + '">' +
                data.ia.resposta_sugerida.replace(/</g, '&lt;') +
                '</textarea>' +
                '<button type="button" class="btn btn-ghost btn-sm" data-use-reply="' + id + '">usar esta resposta</button></div>';
            }
          }
          out.innerHTML = html;

          var use = out.querySelector('[data-use-reply]');
          if (use) {
            use.addEventListener('click', function () {
              var texto = out.querySelector('[data-fill-reply]').value;
              var target = document.querySelector('[data-reply-box="' + id + '"]');
              if (target) {
                target.value = texto;
                target.focus();
              }
            });
          }
        })
        .catch(function () { out.textContent = 'Não foi possível analisar.'; });
    });
  });

  // confirmação em ações destrutivas genéricas
  document.querySelectorAll('form[data-confirm]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      if (!confirm(f.dataset.confirm)) e.preventDefault();
    });
  });
})();
