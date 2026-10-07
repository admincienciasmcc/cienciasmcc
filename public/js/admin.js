/* =========================================================================
   Editor — salvamento automático, fluxo de publicação, fotos com legenda,
   envio direto, prévia da página real, versões e assistente de escrita.
   ========================================================================= */
(function () {
  'use strict';

  var form = document.getElementById('post-form');
  if (!form) return;

  var $ = function (id) { return document.getElementById(id); };
  var csrf = form.querySelector('input[name=_csrf]').value;

  var title = $('title');
  var subtitle = $('subtitle');
  var body = $('body_md');
  var slug = $('slug');
  var excerpt = $('excerpt');
  var seoDesc = $('seo_description');
  var seoTitle = $('seo_title');
  var tags = $('tags');
  var cover = $('cover');
  var coverCredit = $('cover_credit');
  var category = $('category_id');
  var preview = $('preview');
  var galleryList = $('gallery-list');

  var postId = form.dataset.postId || '';
  var isNew = !postId;
  var slugTouched = false;

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

  function get(url) {
    return fetch(url, { headers: { 'x-csrf-token': csrf } }).then(function (r) { return r.json(); });
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

  function horaAgora(ts) {
    var d = ts ? new Date(ts) : new Date();
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  /* --------------------------------------------- salvamento automático ---
     Tudo que ela digita é guardado neste navegador a cada poucos segundos.
     Se o computador travar ou a aba fechar, o texto volta na próxima vez. */

  var CHAVE = 'cienciasmcc:rascunho:' + (postId || 'novo');
  var autosaveEl = $('autosave-status');

  function estadoAtual() {
    return {
      t: Date.now(),
      title: title.value, subtitle: subtitle.value, body: body.value,
      excerpt: excerpt.value, seo: seoDesc.value, seoTitle: seoTitle ? seoTitle.value : '',
      tags: tags.value, cover: cover.value, coverCredit: coverCredit ? coverCredit.value : '',
      category: category.value,
    };
  }

  function guardarLocal() {
    try {
      var e = estadoAtual();
      if (!e.body.trim() && !e.title.trim()) return;
      localStorage.setItem(CHAVE, JSON.stringify(e));
      if (autosaveEl) autosaveEl.textContent = '· guardado às ' + horaAgora();
    } catch (err) { /* armazenamento indisponível: segue sem */ }
  }
  var guardarLogo = debounce(guardarLocal, 2500);

  function aplicarEstado(e) {
    title.value = e.title || ''; subtitle.value = e.subtitle || ''; body.value = e.body || '';
    excerpt.value = e.excerpt || ''; seoDesc.value = e.seo || '';
    if (seoTitle) seoTitle.value = e.seoTitle || '';
    tags.value = e.tags || ''; cover.value = e.cover || '';
    if (coverCredit) coverCredit.value = e.coverCredit || '';
    if (e.category) category.value = e.category;
    renderCoverPreview(); updateTitleLen(); updateLens(); analyzeNow();
  }

  (function oferecerRecuperacao() {
    var salvo;
    try { salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (err) { salvo = null; }
    if (!salvo || !salvo.body) return;

    var servidor = form.dataset.updated ? Date.parse(form.dataset.updated.replace(' ', 'T') + 'Z') : 0;
    var igual = salvo.body === body.value && salvo.title === title.value;
    if (igual || (servidor && salvo.t <= servidor)) {
      localStorage.removeItem(CHAVE);
      return;
    }
    var banner = $('recover-banner');
    $('recover-time').textContent = horaAgora(salvo.t);
    banner.hidden = false;
    $('recover-yes').addEventListener('click', function () {
      aplicarEstado(salvo);
      banner.hidden = true;
      dirty = true;
    });
    $('recover-no').addEventListener('click', function () {
      localStorage.removeItem(CHAVE);
      banner.hidden = true;
    });
  })();

  /* ------------------------------------------------------------- análise  */

  function payload() {
    return {
      title: title.value,
      subtitle: subtitle.value,
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
    // erros primeiro, depois avisos, e o que está bom no fim
    var ordem = { erro: 0, aviso: 1, ok: 2 };
    audit.items.slice().sort(function (a, b) { return ordem[a.level] - ordem[b.level]; })
      .forEach(function (item) {
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
    } else {
      fresh.forEach(function (t) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'suggest-chip';
        chip.textContent = '+ ' + t;
        chip.addEventListener('click', function () {
          tags.value = tags.value.trim() ? tags.value.replace(/,\s*$/, '') + ', ' + t : t;
          chip.remove();
          marcarSujo();
          analyzeNow();
        });
        box.appendChild(chip);
      });
    }

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
        marcarSujo();
        analyzeNow();
      });
      cat.appendChild(b);
    }
  }

  function analyzeNow() {
    if (!body.value.trim() && !title.value.trim()) return;
    post('/admin/api/analisar', payload())
      .then(function (data) {
        renderAudit(data.audit);
        renderSuggestions(data);
        $('text-stats').textContent =
          data.stats.wordCount + ' palavras · ' + data.stats.readingTime +
          ' min · legibilidade ' + data.stats.level;
        $('word-count').textContent = data.stats.wordCount + ' palavras';
        var cel = $('word-count-mobile');
        if (cel) cel.textContent = data.stats.wordCount + ' palavras · ' + data.stats.readingTime + ' min';
        if (preview && !preview.hidden) preview.innerHTML = data.html;
      })
      .catch(function () { /* silencioso: a análise é auxiliar */ });
  }

  var analyzeSoon = debounce(analyzeNow, 900);

  [title, subtitle, body, excerpt, tags, cover, category].forEach(function (el) {
    if (el) el.addEventListener('input', analyzeSoon);
  });
  category.addEventListener('change', analyzeNow);
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

  function updateLens() {
    var n = seoDesc.value.length;
    $('seo-len').textContent = n;
    $('seo-len').style.color = n > 155 ? 'var(--a-red)' : '';
    var ex = $('excerpt-len');
    if (ex) {
      var m = excerpt.value.length;
      ex.textContent = m;
      ex.style.color = m > 0 && (m < 120 || m > 240) ? 'var(--a-amber)' : '';
    }
  }
  seoDesc.addEventListener('input', updateLens);
  excerpt.addEventListener('input', updateLens);
  updateLens();

  $('btn-summary').addEventListener('click', function () {
    post('/admin/api/analisar', payload()).then(function (data) {
      if (!excerpt.value.trim() || confirm('Substituir o resumo atual?')) excerpt.value = data.excerpt;
      if (!seoDesc.value.trim()) seoDesc.value = data.seo_description;
      updateLens();
      marcarSujo();
      analyzeNow();
    });
  });

  /* ------------------------------------------- fluxo de publicação ------
     Três escolhas claras em vez de um menu: rascunho, publicar ou agendar.
     O botão principal diz exatamente o que vai acontecer.                 */

  var statusInputs = form.querySelectorAll('input[name=status]');
  var dateField = $('date-field');
  var dateInput = $('published_at');
  var dateHint = $('date-hint');
  var estadoOriginal = form.dataset.status || 'draft';

  function statusEscolhido() {
    var sel = form.querySelector('input[name=status]:checked');
    return sel ? sel.value : 'draft';
  }

  function atualizarBotoes() {
    var st = statusEscolhido();
    var rotulo = 'Salvar rascunho';
    var classe = 'btn btn-primary';

    if (st === 'published') {
      rotulo = estadoOriginal === 'published' ? '✓ Salvar alterações (no ar)' : '🚀 Publicar agora';
    } else if (st === 'scheduled') {
      rotulo = '⏰ Agendar publicação';
    } else if (estadoOriginal === 'published') {
      rotulo = 'Tirar do ar e guardar como rascunho';
      classe = 'btn btn-danger';
    }

    ['btn-main', 'btn-top', 'btn-mobile'].forEach(function (id) {
      var b = $(id);
      if (!b) return;
      b.textContent = id === 'btn-mobile' ? rotulo.replace(/^[^\w✓]+/, '').replace(' publicação', '') : rotulo;
      if (id === 'btn-main') b.className = classe;
    });

    dateField.hidden = st === 'draft';
    if (st === 'scheduled') {
      dateInput.required = true;
      dateHint.textContent = 'Obrigatória para agendar. O site publica sozinho nessa hora (Brasília).';
      if (!dateInput.value) {
        var d = new Date(Date.now() + 60 * 60000);
        d.setMinutes(0, 0, 0);
        var z = function (n) { return String(n).padStart(2, '0'); };
        dateInput.value = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':00';
      }
    } else {
      dateInput.required = false;
      dateHint.textContent = 'Deixe vazio para usar o momento em que salvar.';
    }
  }
  statusInputs.forEach(function (r) { r.addEventListener('change', atualizarBotoes); });
  atualizarBotoes();

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
    marcarSujo();
    analyzeSoon();
  }

  function prefixLines(prefix) {
    var start = body.selectionStart;
    var lineStart = body.value.lastIndexOf('\n', start - 1) + 1;
    body.setRangeText(prefix, lineStart, lineStart, 'end');
    body.focus();
    marcarSujo();
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
      if (url && url !== 'https://') wrap('[', '](' + url.trim() + ')', 'texto do link');
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
  document.addEventListener('keydown', function (e) {
    if (!(e.metaKey || e.ctrlKey)) return;
    var k = e.key.toLowerCase();
    if (k === 's') { e.preventDefault(); salvar(); return; }
    if (document.activeElement !== body) return;
    if (k === 'b') { e.preventDefault(); actions.bold(); }
    if (k === 'i') { e.preventDefault(); actions.italic(); }
    if (k === 'k') { e.preventDefault(); actions.link(); }
  });

  function salvar() {
    if (statusEscolhido() === 'scheduled' && !dateInput.value) {
      dateInput.focus();
      dateInput.reportValidity();
      return;
    }
    $('btn-main').click();
  }

  /* ------------------------------------------------------ pré-visualização */

  $('toggle-preview').addEventListener('click', function () {
    var showing = !preview.hidden;
    if (showing) {
      preview.hidden = true;
      body.hidden = false;
      this.textContent = '👁 Pré-visualizar';
    } else {
      post('/admin/api/analisar', payload()).then(function (data) { preview.innerHTML = data.html; });
      preview.hidden = false;
      body.hidden = true;
      this.textContent = '✏️ Voltar a escrever';
    }
  });

  var previewCelular = $('toggle-preview-mobile');
  if (previewCelular) {
    previewCelular.addEventListener('click', function () {
      $('toggle-preview').click();
      this.textContent = preview.hidden ? '👁 Ver' : '✏️ Escrever';
      if (!preview.hidden) preview.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------------ ajuda ---- */

  var helpDialog = $('help-dialog');
  if (helpDialog) {
    $('btn-help').addEventListener('click', function () { helpDialog.showModal(); });
  }
  document.querySelectorAll('[data-close-dialog]').forEach(function (b) {
    b.addEventListener('click', function () { b.closest('dialog').close(); });
  });

  /* ------------------------------------------- título vindo da sugestão */

  (function tituloVindoDaSugestao() {
    var sugerido = new URLSearchParams(location.search).get('titulo');
    if (!sugerido || title.value.trim()) return;
    title.value = sugerido.slice(0, 160);
    title.dispatchEvent(new Event('input', { bubbles: true }));
    if (!window.matchMedia('(max-width: 820px)').matches) body.focus();
  })();

  /* no editor a barra de salvar já ocupa o rodapé: o atalho flutuante sai */
  var atalho = document.querySelector('[data-fab]');
  if (atalho) atalho.remove();

  /* -------------------------------------------- painéis no celular ------ */

  function recolherPaineisNoCelular() {
    if (!window.matchMedia('(max-width: 820px)').matches) return;
    var lateral = document.querySelector('.side-panel');
    if (!lateral || lateral.dataset.recolhido) return;
    lateral.dataset.recolhido = '1';

    Array.prototype.forEach.call(lateral.querySelectorAll(':scope > .panel'), function (painel, i) {
      var titulo = painel.querySelector('h2, h3');
      if (!titulo) return;
      var detalhes = document.createElement('details');
      detalhes.className = painel.className;
      if (i === 0) detalhes.open = true;
      var resumo = document.createElement('summary');
      resumo.textContent = titulo.textContent.trim();
      var cabecalho = titulo.closest('.panel-head') || titulo;
      cabecalho.remove();
      detalhes.appendChild(resumo);
      while (painel.firstChild) detalhes.appendChild(painel.firstChild);
      painel.replaceWith(detalhes);
    });
  }
  recolherPaineisNoCelular();
  window.addEventListener('resize', recolherPaineisNoCelular);

  /* ------------------------------------------ biblioteca, envio e galeria */

  var dialog = $('media-dialog');
  var mediaGrid = $('media-grid');
  var mediaTarget = 'cover';

  var DIALOG_TEXTS = {
    cover: ['Imagem de capa', 'A capa aparece no topo do post e nos cartões da listagem. Clique numa foto ou envie uma nova.'],
    gallery: ['Fotos deste post', 'Clique em quantas quiser — cada uma vira uma linha com legenda e crédito.'],
    body: ['Foto no meio do texto', 'Escolha a foto; depois você escreve a legenda e o crédito, e ela entra onde o cursor está.'],
  };

  function openMedia(target) {
    mediaTarget = target;
    var texts = DIALOG_TEXTS[target] || DIALOG_TEXTS.cover;
    $('media-dialog-title').textContent = texts[0];
    $('media-dialog-hint').textContent = texts[1];
    $('insert-form').hidden = true;
    if (dialog.showModal) dialog.showModal();
  }

  $('btn-pick-cover').addEventListener('click', function () { openMedia('cover'); });
  $('btn-add-gallery').addEventListener('click', function () { openMedia('gallery'); });

  function escolher(item) {
    var src = item.dataset.src;
    var alt = item.dataset.alt || '';
    var credit = item.dataset.credit || '';

    if (mediaTarget === 'cover') {
      cover.value = src;
      renderCoverPreview();
      if (credit && coverCredit && !coverCredit.value.trim()) coverCredit.value = credit;
      dialog.close();
    } else if (mediaTarget === 'gallery') {
      addGalleryRow({ url: src, caption: alt, credit: credit });
      item.classList.add('is-picked');
      setTimeout(function () { item.classList.remove('is-picked'); }, 700);
    } else {
      // foto no texto: pede legenda e crédito antes de inserir
      var f = $('insert-form');
      f.hidden = false;
      f.dataset.src = src;
      $('insert-thumb').src = src;
      $('insert-alt').value = alt;
      $('insert-caption').value = '';
      $('insert-credit').value = credit;
      f.scrollIntoView({ block: 'nearest' });
      $('insert-caption').focus();
      return;
    }
    marcarSujo();
    analyzeNow();
  }

  function ligarItem(item) {
    item.addEventListener('click', function () { escolher(item); });
  }
  Array.prototype.forEach.call(mediaGrid.querySelectorAll('.media-pick'), ligarItem);

  $('insert-confirm').addEventListener('click', function () {
    var f = $('insert-form');
    var legenda = $('insert-caption').value.trim();
    var credito = $('insert-credit').value.trim();
    var alt = $('insert-alt').value.trim().replace(/[\[\]]/g, '');
    var titulo = [legenda, credito].filter(Boolean).join(' | ').replace(/"/g, '”');
    var md = '\n![' + alt + '](' + f.dataset.src + (titulo ? ' "' + titulo + '"' : '') + ')\n';
    var start = body.selectionStart;
    body.setRangeText(md, start, start, 'end');
    f.hidden = true;
    dialog.close();
    body.focus();
    marcarSujo();
    analyzeNow();
  });
  $('insert-cancel').addEventListener('click', function () { $('insert-form').hidden = true; });

  /* envio direto pela biblioteca */
  var uploadInput = $('upload-input');
  var uploadZone = $('upload-zone');
  var uploadStatus = $('upload-status');

  function adicionarAoGrid(img) {
    var item = document.createElement('div');
    item.className = 'media-item media-pick';
    item.dataset.src = img.url;
    item.dataset.alt = img.alt || '';
    item.dataset.credit = img.credit || '';
    item.innerHTML = '<img alt=""><div class="meta"></div>';
    item.querySelector('img').src = img.url;
    item.querySelector('.meta').textContent = (img.alt || img.original || '').slice(0, 40);
    mediaGrid.insertBefore(item, mediaGrid.firstChild);
    ligarItem(item);
    var vazio = $('media-empty');
    if (vazio) vazio.remove();
    return item;
  }

  function enviarArquivos(arquivos) {
    var lista = Array.prototype.filter.call(arquivos, function (f) { return /^image\//.test(f.type); });
    if (!lista.length) return;
    var fd = new FormData();
    fd.append('_csrf', csrf);
    lista.forEach(function (f) { fd.append('arquivos', f); });
    uploadStatus.innerHTML = '<span class="spinner"></span> enviando ' + lista.length + ' foto(s)…';
    uploadZone.classList.add('is-busy');

    fetch('/admin/api/midia/enviar', { method: 'POST', body: fd, headers: { 'x-csrf-token': csrf } })
      .then(function (r) { if (!r.ok) throw new Error('O servidor recusou o envio.'); return r.json(); })
      .then(function (data) {
        uploadStatus.textContent = data.imagens.length + ' foto(s) enviada(s). Clique numa delas para usar.';
        var itens = data.imagens.map(adicionarAoGrid);
        // atalho: uma foto só vai direto para o destino escolhido
        if (itens.length === 1 && mediaTarget !== 'gallery') escolher(itens[0]);
        if (mediaTarget === 'gallery') itens.forEach(escolher);
      })
      .catch(function (err) { uploadStatus.textContent = '⚠️ ' + err.message; })
      .finally(function () { uploadZone.classList.remove('is-busy'); uploadInput.value = ''; });
  }

  uploadInput.addEventListener('change', function () { enviarArquivos(uploadInput.files); });
  ['dragenter', 'dragover'].forEach(function (ev) {
    uploadZone.addEventListener(ev, function (e) { e.preventDefault(); uploadZone.classList.add('is-over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    uploadZone.addEventListener(ev, function (e) { e.preventDefault(); uploadZone.classList.remove('is-over'); });
  });
  uploadZone.addEventListener('drop', function (e) { enviarArquivos(e.dataTransfer.files); });

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
      row.remove(); updateGalleryState(); marcarSujo();
    });
    row.querySelector('[data-gal=up]').addEventListener('click', function () {
      if (row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
      marcarSujo();
    });
    row.querySelector('[data-gal=down]').addEventListener('click', function () {
      if (row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
      marcarSujo();
    });

    galleryList.appendChild(row);
    updateGalleryState();
  }

  var galleryData = $('gallery-data');
  if (galleryData) {
    try { JSON.parse(galleryData.textContent || '[]').forEach(addGalleryRow); } catch (e) { /* vazio */ }
  }
  updateGalleryState();

  /* ------------------------------------------------------ versões salvas */

  var btnVersions = $('btn-versions');
  if (btnVersions) {
    btnVersions.addEventListener('click', function () {
      var lista = $('versions-list');
      lista.innerHTML = '<span class="spinner"></span> carregando…';
      get('/admin/api/posts/' + postId + '/versoes').then(function (data) {
        if (!data.versoes.length) { lista.textContent = 'Ainda não há versões anteriores: elas surgem a partir do segundo salvamento.'; return; }
        lista.innerHTML = '';
        data.versoes.forEach(function (v) {
          var row = document.createElement('div');
          row.className = 'version-row';
          row.innerHTML = '<div><b></b><br><span class="muted"></span></div>';
          row.querySelector('b').textContent = v.quando + (v.autor ? ' · ' + v.autor : '');
          row.querySelector('.muted').textContent = v.title + ' · ' + Math.round(v.tamanho / 5.5) + ' palavras aprox.';
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn btn-ghost btn-sm';
          b.textContent = 'restaurar';
          b.addEventListener('click', function () {
            if (!confirm('Trocar o texto atual pelo desta versão? Nada é salvo até você clicar em salvar.')) return;
            get('/admin/api/versoes/' + v.id).then(function (d) {
              title.value = d.versao.title;
              subtitle.value = d.versao.subtitle || '';
              excerpt.value = d.versao.excerpt || '';
              body.value = d.versao.body_md || '';
              updateTitleLen(); updateLens(); marcarSujo(); analyzeNow();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            });
          });
          row.appendChild(b);
          lista.appendChild(row);
        });
      }).catch(function () { lista.textContent = 'Não foi possível carregar as versões.'; });
    });
  }

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
          marcarSujo();
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
          updateLens();

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
              marcarSujo();
              analyzeNow();
            });
            box.appendChild(b);
          });
          aiStatus('Resumo, tags e títulos atualizados.');
          marcarSujo();
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
          marcarSujo();
          analyzeNow();
        })
        .catch(function (err) { $('draft-status').textContent = '⚠️ ' + err.message; })
        .finally(function () { draftBtn.disabled = false; });
    });
  }

  /* --------------------------------------------------- avisos de saída   */

  var dirty = false;
  function marcarSujo() { dirty = true; guardarLogo(); }
  form.addEventListener('input', marcarSujo);

  form.addEventListener('submit', function (e) {
    // a prévia abre em outra aba e não salva: o texto continua pendente aqui
    if (e.submitter && e.submitter.id === 'btn-previa') return;
    dirty = false;
    try { localStorage.removeItem(CHAVE); } catch (err) { /* ok */ }
  });

  window.addEventListener('beforeunload', function (e) {
    if (!dirty) return;
    guardarLocal();
    e.preventDefault();
    e.returnValue = '';
  });

  analyzeNow();
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
              if (target) { target.value = texto; target.focus(); }
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
