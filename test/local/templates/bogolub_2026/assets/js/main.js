/* =========================================================
   main.js — черновик редизайна. Чистый JS (ES2017), без jQuery
   и фреймворков. Подключать с атрибутом defer. Всё работает как
   прогрессивное улучшение: без JS меню, поиск, фильтр афиши и
   переключатель оформления остаются обычными ссылками и формами
   (сервер Битрикса отдаёт готовую разметку).
   ========================================================= */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var mqDesktop = window.matchMedia('(min-width: 960px)');
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function store(key, val) {           // localStorage + cookie (cookie читает Битрикс на сервере)
    try { localStorage.setItem(key, val); } catch (e) { /* приватный режим */ }
    document.cookie = key + '=' + encodeURIComponent(val) + '; path=/; max-age=31536000; SameSite=Lax';
  }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

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

  /* ---------- 2. Подменю (паттерн disclosure, не ARIA menu) ---------- */
  var toggles = $all('.main-nav__toggle');
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

  /* ---------- 3. Поиск: вкладки «Каталог / Сайт / Афиша» ----------
     Паттерн ARIA tabs: role=tablist/tab/tabpanel, стрелки ←/→,
     Home/End, «перемещающийся» tabindex. Без JS вместо вкладок
     показан обычный <select name="scope"> — сервер (страница
     /search/) сам перенаправит запрос в каталог или афишу.
     Каждая форма поиска на странице работает независимо. */
  $all('[data-js="search-form"]').forEach(function (form) {
    var tabs = $all('[role="tab"]', form);
    var panel = form.querySelector('[role="tabpanel"]');
    var input = form.querySelector('.search__input');
    var select = form.querySelector('select[name="scope"]');
    function selectTab(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      form.action = tab.getAttribute('data-action');
      if (input) input.placeholder = tab.getAttribute('data-placeholder');
      if (select) select.value = tab.getAttribute('data-scope');
      if (panel) panel.setAttribute('aria-labelledby', tab.id);
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectTab(tab); if (input) input.focus(); });
      tab.addEventListener('keydown', function (e) {
        var n = tabs.length, j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % n;
        else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = n - 1;
        if (j === null) return;
        e.preventDefault();
        selectTab(tabs[j], true);
      });
    });
  });

  /* ---------- 4. «Крупный шрифт и контраст» ----------
     В разметке это ССЫЛКА ?a11y=1 / ?a11y=0: без JS Битрикс
     ставит cookie и отдаёт <html class="a11y-large a11y-contrast">.
     С JS ссылка становится кнопкой-переключателем (aria-pressed),
     состояние — в localStorage и cookie «bl-a11y». Класс на <html>
     ставится ещё в <head> (маленький inline-скрипт), без мигания. */
  var A11Y = 'bl-a11y';
  var a11yLinks = $all('[data-js="a11y-toggle"]');
  function applyA11y(on) {
    doc.classList.toggle('a11y-large', on);
    doc.classList.toggle('a11y-contrast', on);
    a11yLinks.forEach(function (a) {
      a.setAttribute('aria-pressed', String(on));
      a.setAttribute('href', '?a11y=' + (on ? '0' : '1'));
    });
  }
  var param = new URLSearchParams(location.search).get('a11y');
  if (param === '1' || param === '0') store(A11Y, param);   // имитация серверной обработки ссылки
  var savedA11y = load(A11Y);   // нет записи → берём то, что отдал сервер (класс на <html> по cookie)
  applyA11y(savedA11y === null ? doc.classList.contains('a11y-large') : savedA11y === '1');
  a11yLinks.forEach(function (a) {
    a.setAttribute('role', 'button');
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var on = a.getAttribute('aria-pressed') !== 'true';
      applyA11y(on);
      store(A11Y, on ? '1' : '0');
    });
    a.addEventListener('keydown', function (e) {       // role=button → пробел тоже нажимает
      if (e.key === ' ') { e.preventDefault(); a.click(); }
    });
  });

  /* ---------- 5. Временное объявление: «Скрыть» ----------
     Кнопка видна только с JS. Выбор запоминается (localStorage +
     cookie с id объявления: новое объявление снова будет показано). */
  $all('[data-notice-id]').forEach(function (notice) {
    var key = 'bl-notice-' + notice.getAttribute('data-notice-id');
    var btn = notice.querySelector('[data-js="notice-close"]');
    if (load(key) === 'hidden') { notice.hidden = true; return; }
    if (!btn) return;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      notice.hidden = true;
      store(key, 'hidden');
      var main = document.getElementById('main');   // фокус не теряется
      if (main) main.focus();
    });
  });

  /* ---------- 6. Сегодняшний день в графике работы ---------- */
  var today = new Date().getDay(); // 0 — воскресенье
  $all('.hours tr[data-days~="' + today + '"]').forEach(function (row) { row.classList.add('is-today'); });

  /* ---------- 7. Фильтры афиши ----------
     Форма — обычный GET (method="get"): в Битриксе фильтрует сервер
     ($arrAfishaFilter для news.list). На мобильном фильтры свёрнуты
     в <details> «Фильтры»; на десктопе всегда раскрыты.
     ДЕМО: в статичном прототипе сервера нет, поэтому здесь те же
     GET-параметры применяются к карточкам на клиенте. */
  var filterForm = document.querySelector('[data-js="afisha-filter"]');
  var disclosure = document.querySelector('[data-js="filters-details"]');
  var params = new URLSearchParams(location.search);
  var active = ['when', 'date', 'place', 'type', 'age', 'free'].filter(function (k) { return params.get(k); });
  if (disclosure) {
    var sync = function () { if (mqDesktop.matches) disclosure.open = true; };
    if (!mqDesktop.matches && !active.length) disclosure.open = false;
    sync();
    if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', sync);
    var badge = disclosure.querySelector('[data-js="filters-count"]');
    if (badge && active.length) { badge.textContent = active.length; badge.hidden = false; }
  }
  var list = document.querySelector('[data-js="event-list"]');
  if (filterForm && list && document.body.hasAttribute('data-demo-filter')) {
    // заполнить форму значениями из адреса — как это сделал бы сервер
    params.forEach(function (v, k) {
      var f = filterForm.elements[k];
      if (!f) return;
      if (f.type === 'checkbox') f.checked = v === f.value; else f.value = v;
    });
    var DEMO_TODAY = '2026-10-20';                    // дата-пример прототипа
    var ranges = { today: ['2026-10-20', '2026-10-20'], week: ['2026-10-19', '2026-10-25'],
                   month: ['2026-10-01', '2026-10-31'], nov: ['2026-11-01', '2026-11-30'], dec: ['2026-12-01', '2026-12-31'] };
    var q = (params.get('q') || '').trim().toLowerCase();
    var n = 0;
    $all('[data-date]', list).forEach(function (c) {
      var d = c.getAttribute('data-date'), ok = d >= DEMO_TODAY;
      var w = ranges[params.get('when')];
      if (w) ok = ok && d >= w[0] && d <= w[1];
      if (params.get('date')) ok = ok && d === params.get('date');
      ['place', 'type', 'age'].forEach(function (k) { if (params.get(k)) ok = ok && c.getAttribute('data-' + k) === params.get(k); });
      if (params.get('free')) ok = ok && c.getAttribute('data-access') === 'free';
      if (q) ok = ok && c.textContent.toLowerCase().indexOf(q) !== -1;
      c.hidden = !ok; if (ok) n++;
    });
    var counter = document.querySelector('[data-js="results-count"]');
    if (counter) counter.textContent = 'Найдено событий: ' + n;
    var empty = document.querySelector('[data-js="results-empty"]');
    if (empty) empty.hidden = n !== 0;
  }

  /* ---------- 8. Закреплённая шапка (ред. 21.10.2026) ----------
     Сама шапка — CSS position: sticky (работает и без JS). Здесь:
     высота шапки → --head-h (scroll-padding-top: якоря и фокус не
     прячутся под шапкой), тень после начала прокрутки, лупа на телефоне. */
  var head = document.querySelector('[data-js="site-head"]');
  var headerRow = head && head.querySelector('.site-header');
  function measure() {
    if (!head) return;
    doc.style.setProperty('--head-h', head.offsetHeight + 'px');
    if (headerRow) doc.style.setProperty('--head-row-h', headerRow.offsetHeight + 'px');
  }
  if (head) {
    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(headerRow || head);
    else window.addEventListener('resize', measure);
    var onScroll = function () { head.classList.toggle('is-stuck', window.scrollY > 4); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
  var sToggle = document.querySelector('[data-js="search-toggle"]');
  var sWrap = sToggle && document.getElementById(sToggle.getAttribute('aria-controls'));
  if (sToggle && sWrap) {
    var syncSearch = function () {
      if (mqDesktop.matches) sWrap.removeAttribute('data-open');
      else sWrap.setAttribute('data-open', sToggle.getAttribute('aria-expanded'));
    };
    syncSearch();
    if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', syncSearch);
    sToggle.addEventListener('click', function () {
      var open = sToggle.getAttribute('aria-expanded') !== 'true';
      sToggle.setAttribute('aria-expanded', String(open));
      syncSearch();
      if (open) { var inp = sWrap.querySelector('input[type="search"]'); if (inp) inp.focus(); }
    });
  }
  var sJump = document.querySelector('[data-js="search-jump"]');   // главная: к большому поиску
  if (sJump) sJump.addEventListener('click', function (e) {
    var inp = document.getElementById(sJump.getAttribute('href').slice(1));
    if (!inp) return;
    e.preventDefault(); inp.focus({ preventScroll: true });
    inp.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
})();
