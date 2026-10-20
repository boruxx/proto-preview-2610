/* =========================================================
   main.js — черновик редизайна. Чистый JS (ES2017), без jQuery.
   Подключать с атрибутом defer. Всё — прогрессивное улучшение:
   без JS меню и поиск работают как обычные ссылки/форма.
   ========================================================= */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var mqDesktop = window.matchMedia('(min-width: 960px)');

  /* ---------- 1. Мобильное меню (бургер) ---------- */
  var burger = document.querySelector('[data-js="burger"]');
  var nav = document.getElementById('main-nav');
  if (burger && nav) {
    nav.setAttribute('data-open', 'false');
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(open));
      nav.setAttribute('data-open', String(open));
      if (open) { var first = nav.querySelector('a, button'); if (first) first.focus(); }
    });
  }

  /* ---------- 2. Подменю (disclosure, не «menu» ARIA) ----------
     Кнопка с aria-expanded + aria-controls, Esc закрывает и
     возвращает фокус, клик вне — закрывает (десктоп). */
  var toggles = Array.prototype.slice.call(document.querySelectorAll('.main-nav__toggle'));
  function closeAll(except) {
    toggles.forEach(function (t) {
      if (t === except) return;
      t.setAttribute('aria-expanded', 'false');
      var sub = document.getElementById(t.getAttribute('aria-controls'));
      if (sub) sub.hidden = true;
    });
  }
  toggles.forEach(function (t) {
    var sub = document.getElementById(t.getAttribute('aria-controls'));
    if (!sub) return;
    sub.hidden = true;
    t.setAttribute('aria-expanded', 'false');
    t.addEventListener('click', function () {
      var open = t.getAttribute('aria-expanded') !== 'true';
      if (mqDesktop.matches) closeAll(t);
      t.setAttribute('aria-expanded', String(open));
      sub.hidden = !open;
    });
    sub.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { t.setAttribute('aria-expanded', 'false'); sub.hidden = true; t.focus(); }
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (toggles.some(function (t) { return t === document.activeElement; })) closeAll();
    if (burger && burger.getAttribute('aria-expanded') === 'true' && !mqDesktop.matches) {
      burger.click(); burger.focus();
    }
  });
  document.addEventListener('click', function (e) {
    if (mqDesktop.matches && nav && !nav.contains(e.target)) closeAll();
  });

  /* ---------- 3. Поиск: переключатель областей (tabs) ----------
     Каталог → внешний электронный каталог (адрес уточнить),
     Сайт → /search/ (bitrix:search.page), Афиша → /afisha/?q= */
  var scopes = Array.prototype.slice.call(document.querySelectorAll('.search__scope'));
  var form = document.querySelector('[data-js="search-form"]');
  var input = form && form.querySelector('.search__input');
  function selectScope(btn, focus) {
    scopes.forEach(function (b) {
      var on = b === btn;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (form) {
      form.action = btn.getAttribute('data-action');
      if (input) input.placeholder = btn.getAttribute('data-placeholder');
      var hidden = form.querySelector('input[name="scope"]');
      if (hidden) hidden.value = btn.getAttribute('data-scope');
    }
    if (focus) btn.focus();
  }
  scopes.forEach(function (btn, i) {
    btn.addEventListener('click', function () { selectScope(btn); if (input) input.focus(); });
    btn.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      selectScope(scopes[(i + d + scopes.length) % scopes.length], true);
    });
  });

  /* ---------- 4. Режим доступности (заглушка) ---------- */
  var a11y = document.querySelector('[data-js="a11y-toggle"]');
  var KEY = 'bl-a11y';
  function applyA11y(on) {
    doc.classList.toggle('a11y-large', on);
    doc.classList.toggle('a11y-contrast', on);
    if (a11y) a11y.setAttribute('aria-pressed', String(on));
  }
  try { applyA11y(localStorage.getItem(KEY) === '1'); } catch (e) { /* приватный режим */ }
  if (a11y) a11y.addEventListener('click', function () {
    var on = a11y.getAttribute('aria-pressed') !== 'true';
    applyA11y(on);
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
  });

  /* ---------- 5. Сегодняшний день в графике работы ---------- */
  var today = new Date().getDay(); // 0 — воскресенье
  var row = document.querySelector('.hours tr[data-days~="' + today + '"]');
  if (row) row.classList.add('is-today');

  /* ---------- 6. Фильтр афиши (демо, на клиенте) ----------
     В Битриксе фильтр будет серверным (GET-параметры +
     bitrix:catalog.smart.filter или свой $arrFilter для news.list);
     здесь — только демонстрация поведения и доступности. */
  var list = document.querySelector('[data-js="event-list"]');
  if (list) {
    var cards = Array.prototype.slice.call(list.querySelectorAll('[data-type]'));
    var counter = document.querySelector('[data-js="results-count"]');
    var state = { type: 'all', when: 'all' };
    function render() {
      var n = 0;
      cards.forEach(function (c) {
        var ok = (state.type === 'all' || c.getAttribute('data-type') === state.type) &&
                 (state.when === 'all' || (c.getAttribute('data-when') || '').split(' ').indexOf(state.when) !== -1);
        c.hidden = !ok; if (ok) n++;
      });
      if (counter) counter.textContent = 'Найдено событий: ' + n;   // aria-live="polite" в разметке
    }
    document.querySelectorAll('.chip[data-filter]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var group = chip.getAttribute('data-filter');
        document.querySelectorAll('.chip[data-filter="' + group + '"]').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', 'true');
        state[group] = chip.getAttribute('data-value');
        render();
      });
    });
    render();
  }
})();
