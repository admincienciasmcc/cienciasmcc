/* Interações leves do site público. */
(function () {
  'use strict';

  // gaveta de navegação no celular
  var toggle = document.querySelector('[data-nav-toggle]');
  var nav = document.getElementById('nav-principal');
  if (toggle && nav) {
    var icon = toggle.querySelector('[data-nav-icon]');
    var label = toggle.querySelector('.sr-only');
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (icon) icon.textContent = open ? '\u00d7' : '\u2630';
      if (label) label.textContent = open ? 'Fechar menu' : 'Abrir menu';
    };

    toggle.addEventListener('click', function () {
      setOpen(!nav.classList.contains('is-open'));
    });

    // fecha ao clicar fora, ao escolher um item ou com Esc
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) && e.target.tagName !== 'A') return;
      if (toggle.contains(e.target)) return;
      setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) setOpen(false);
    });

    // ao girar o aparelho ou alargar a janela, a gaveta deixa de existir
    var desktop = window.matchMedia('(min-width: 1201px)');
    var aoMudar = function (e) { if (e.matches) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', aoMudar);
    else if (desktop.addListener) desktop.addListener(aoMudar);
  }

  // recordações: foto ampliada ao tocar, com setas, teclado e deslize
  var ampliada = document.querySelector('[data-ampliada]');
  var fotos = Array.prototype.slice.call(document.querySelectorAll('[data-ampliar]'));
  if (ampliada && fotos.length && typeof ampliada.showModal === 'function') {
    var grande = ampliada.querySelector('[data-ampliada-img]');
    var legenda = ampliada.querySelector('[data-ampliada-legenda]');
    var atual = 0;
    var mostrar = function (i) {
      atual = (i + fotos.length) % fotos.length;
      var link = fotos[atual];
      grande.src = link.href;
      grande.alt = link.querySelector('img').alt;
      legenda.textContent = link.dataset.legenda || '';
    };

    fotos.forEach(function (link, i) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        mostrar(i);
        ampliada.showModal();
      });
    });
    ampliada.querySelector('[data-ampliada-fechar]').addEventListener('click', function () {
      ampliada.close();
    });
    ampliada.querySelectorAll('[data-ampliada-passo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        mostrar(atual + Number(btn.dataset.ampliadaPasso));
      });
    });
    // toque fora da foto fecha
    ampliada.addEventListener('click', function (e) {
      if (e.target === ampliada || e.target.tagName === 'FIGURE') ampliada.close();
    });
    ampliada.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') mostrar(atual + 1);
      if (e.key === 'ArrowLeft') mostrar(atual - 1);
    });
    var inicioX = null;
    ampliada.addEventListener('touchstart', function (e) {
      inicioX = e.touches.length === 1 ? e.touches[0].clientX : null;
    }, { passive: true });
    ampliada.addEventListener('touchend', function (e) {
      if (inicioX === null) return;
      var dx = e.changedTouches[0].clientX - inicioX;
      if (Math.abs(dx) > 50) mostrar(atual + (dx < 0 ? 1 : -1));
      inicioX = null;
    }, { passive: true });
  }

  // marca o horário de abertura do formulário (usado contra robôs)
  var ts = document.querySelector('[data-ts-input]');
  if (ts) ts.value = String(Date.now());

  // responder a um comentário
  var form = document.querySelector('[data-comment-form]');
  if (form) {
    var parentInput = form.querySelector('[data-parent-input]');
    var note = form.querySelector('[data-reply-note]');
    var noteName = form.querySelector('[data-reply-name]');

    document.querySelectorAll('[data-reply]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        parentInput.value = btn.dataset.reply;
        noteName.textContent = btn.dataset.name;
        note.hidden = false;
        form.querySelector('textarea').focus();
        document.getElementById('form-comentario').scrollIntoView({ behavior: 'smooth' });
      });
    });

    var cancel = form.querySelector('[data-cancel-reply]');
    if (cancel) {
      cancel.addEventListener('click', function () {
        parentInput.value = '';
        note.hidden = true;
      });
    }
  }

  // destaca o item do índice conforme a leitura avança
  var links = document.querySelectorAll('.post-toc a');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) {
      map[a.getAttribute('href').slice(1)] = a;
    });
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = map[entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            links.forEach(function (a) {
              a.style.borderColor = '';
              a.style.color = '';
            });
            link.style.borderColor = 'var(--forest)';
            link.style.color = 'var(--forest)';
          }
        });
      },
      { rootMargin: '-90px 0px -70% 0px' },
    );
    document.querySelectorAll('.prose h2, .prose h3').forEach(function (h) {
      if (h.id) observer.observe(h);
    });
  }
})();
