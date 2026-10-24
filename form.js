/* Заявка с сайта: форма встроена из Яндекс Форм (данные хранятся в России), здесь кнопки пакетов и связи.
   Все адреса, которые нужно подставить, собраны здесь, в CONFIG. */
(function () {
  'use strict';

  var CONFIG = {
    // Встроенная форма Яндекс Форм
    formUrl: 'https://forms.yandex.ru/u/6ac624145056902200c9004b/',
    // Идентификатор вопроса «Что вас интересует?» (Конструктор → вопрос → Настройки)
    packQuestion: 'answer_choices_9008992116628072',
    // Ваш ник в Telegram без @ (для кнопки «Написать в Telegram»). Пусто - кнопка скрыта.
    telegram: 'Inga_TkSt',
    // Телефон в любом виде, например +7 900 000-00-00. Пусто - кнопка скрыта.
    phone: '+7 965 077-01-19'
  };

  // Идентификаторы вариантов ответа в Яндекс Форме
  var PACKS = {
    start: '1792861909629',
    system: '1792861929347',
    turnkey: '1792861941503',
    part: '1792862009114'
  };

  var frame = document.getElementById('lead-frame');
  if (!frame) { return; }

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

  /* ---------- Кнопки пакетов подставляют выбор в форму ---------- */
  document.querySelectorAll('[data-pack]').forEach(function (a) {
    a.addEventListener('click', function () {
      var id = PACKS[a.dataset.pack];
      if (!id) { return; }
      frame.src = CONFIG.formUrl + '?iframe=1&' + CONFIG.packQuestion + '=' + id;
    });
  });

  /* ---------- Высота рамки подстраивается под форму ---------- */
  window.addEventListener('message', function (e) {
    if (e.origin !== 'https://forms.yandex.ru') { return; }
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (err) { return; } }
    var h = d && d['iframe-height'];
    if (h > 200 && h < 3000) { frame.style.height = Math.ceil(h) + 'px'; }
  });
})();
