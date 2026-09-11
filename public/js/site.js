/* Interações leves do site público. */
(function () {
  'use strict';

  // gaveta de navegação no celular
  var toggle = document.querySelector('[data-nav-toggle]');
  var nav = document.getElementById('nav-principal');
  if (toggle && nav) {
    var icon = toggle.querySelector('[data-nav-icon]');
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (icon) icon.textContent = open ? '\u00d7' : '\u2630';
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
