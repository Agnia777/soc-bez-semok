/* Заявка с сайта: проверка полей, отправка в Telegram через Cloudflare Worker, кнопки пакетов и связи.
   Все адреса, которые нужно подставить, собраны здесь, в CONFIG. */
(function () {
  'use strict';

  var CONFIG = {
    // Адрес Worker из папки worker/ (вида https://soc-bez-semok-form.ИМЯ.workers.dev). Пока пусто, форма покажет запасной вариант.
    endpoint: 'https://soc-bez-semok-form.877878327.workers.dev',
    // Ваш ник в Telegram без @ (для кнопки «Написать в Telegram»). Пусто - кнопка скрыта.
    telegram: 'Inga_TkSt',
    // Телефон в любом виде, например +7 900 000-00-00. Пусто - кнопка скрыта.
    phone: '+7 965 077-01-19',
    // Запасная форма на случай, если отправка не сработала
    fallbackForm: 'https://forms.yandex.ru/u/6ac624145056902200c9004b/'
  };

  var PACKS = {
    start: 'Пакет «Старт», 10 000 ₽',
    system: 'Пакет «Система», 35 000 ₽',
    turnkey: 'Пакет «Под ключ», от 80 000 ₽',
    part: 'Только часть услуг'
  };

  var form = document.getElementById('lead-form');
  if (!form) { return; }

  var done = document.getElementById('form-done');
  var errBox = document.getElementById('form-error');
  var sendBtn = form.querySelector('.btn.send');
  var openedAt = Date.now();

  /* ---------- Кнопки связи ---------- */
  var tg = document.getElementById('c-tg');
  var ph = document.getElementById('c-phone');
  var tgName = CONFIG.telegram.replace(/^@/, '').trim();
  var phDigits = CONFIG.phone.replace(/[^\d+]/g, '');
  if (tgName && tg) { tg.href = 'https://t.me/' + encodeURIComponent(tgName); tg.hidden = false; }
  if (phDigits && ph) {
    ph.href = 'tel:' + phDigits;
    document.getElementById('c-phone-text').textContent = 'Позвонить: ' + CONFIG.phone.trim();
    ph.hidden = false;
  }
  if (!tgName && !phDigits) {
    var row = document.querySelector('.contact-row');
    if (row) { row.hidden = true; }
  }
  if (!tgName && !phDigits) {
    var doneNote = done.querySelector('p:last-child');
    if (doneNote) { doneNote.hidden = true; }
  }

  /* ---------- Кнопки пакетов подставляют выбор в форму ---------- */
  var packSelect = document.getElementById('f-pack');
  document.querySelectorAll('[data-pack]').forEach(function (a) {
    a.addEventListener('click', function () {
      if (PACKS[a.dataset.pack]) { packSelect.value = a.dataset.pack; }
      if (!form.hidden) {
        // дать странице доехать до якоря, затем поставить курсор в первое поле
        setTimeout(function () { document.getElementById('f-name').focus({ preventScroll: true }); }, 500);
      }
    });
  });

  /* ---------- Проверка полей ---------- */
  var fields = {
    name: { el: document.getElementById('f-name'), err: document.getElementById('e-name') },
    phone: { el: document.getElementById('f-phone'), err: document.getElementById('e-phone') },
    consent: { el: document.getElementById('f-consent'), err: document.getElementById('e-consent') }
  };

  function validate(key) {
    var f = fields[key], v = f.el.value.trim(), msg = '';
    if (key === 'name') {
      if (v.length < 2) { msg = 'Напишите, как к вам обращаться.'; }
    } else if (key === 'phone') {
      var digits = v.replace(/\D/g, '');
      if (!digits) { msg = 'Укажите телефон, чтобы я могла вам написать.'; }
      else if (digits.length < 10 || digits.length > 15 || /[^\d\s()+\-.]/.test(v)) { msg = 'Проверьте номер: в нём должно быть от 10 цифр, например +7 900 000-00-00.'; }
    } else if (key === 'consent') {
      if (!f.el.checked) { msg = 'Без согласия на обработку данных заявку отправить нельзя.'; }
    }
    f.err.textContent = msg;
    f.err.hidden = !msg;
    if (msg) { f.el.setAttribute('aria-invalid', 'true'); } else { f.el.removeAttribute('aria-invalid'); }
    return !msg;
  }

  Object.keys(fields).forEach(function (key) {
    var el = fields[key].el;
    el.addEventListener('blur', function () { if (el.value || el.type === 'checkbox') { validate(key); } });
    el.addEventListener('input', function () { if (fields[key].el.hasAttribute('aria-invalid')) { validate(key); } });
    el.addEventListener('change', function () { if (fields[key].el.hasAttribute('aria-invalid')) { validate(key); } });
  });

  /* ---------- Отправка ---------- */
  function showError(html) {
    errBox.innerHTML = html;
    errBox.hidden = false;
  }

  function fallbackHtml(lead) {
    var html = lead + ' Можно заполнить <a href="' + CONFIG.fallbackForm + '" target="_blank" rel="noopener">запасную форму</a>';
    if (tgName) { html += ' или написать в <a href="https://t.me/' + encodeURIComponent(tgName) + '" target="_blank" rel="noopener">Telegram</a>'; }
    return html + '.';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.hidden = true;

    var ok = true, firstBad = null;
    ['name', 'phone', 'consent'].forEach(function (key) {
      if (!validate(key)) { ok = false; if (!firstBad) { firstBad = fields[key].el; } }
    });
    if (!ok) { firstBad.focus(); return; }

    var data = new FormData(form);
    if (data.get('website')) { // робот заполнил скрытое поле: делаем вид, что всё хорошо
      showDone(fields.name.el.value.trim());
      return;
    }

    if (!CONFIG.endpoint) {
      showError(fallbackHtml('Приём заявок на сайте ещё не подключён.'));
      return;
    }

    var payload = {
      name: fields.name.el.value.trim(),
      phone: fields.phone.el.value.trim(),
      niche: data.get('niche') || '',
      pack: PACKS[data.get('pack')] || '',
      consent: true,
      page: location.origin + location.pathname,
      secondsOnPage: Math.round((Date.now() - openedAt) / 1000)
    };

    sendBtn.disabled = true;
    sendBtn.textContent = 'Отправляю…';

    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) { ctrl.abort(); } }, 15000);

    fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (res.ok && body.ok) { showDone(payload.name); return; }
        throw new Error(body.error || ('HTTP ' + res.status));
      });
    }).catch(function () {
      showError(fallbackHtml('Заявка не отправилась: проверьте интернет и попробуйте ещё раз.'));
    }).then(function () {
      clearTimeout(timer);
      sendBtn.disabled = false;
      sendBtn.textContent = 'Отправить заявку';
    });
  });

  function showDone(name) {
    document.getElementById('done-name').textContent = name;
    form.hidden = true;
    done.hidden = false;
    done.focus();
    done.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
})();
