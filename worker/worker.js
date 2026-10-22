// Принимает заявку с сайта и пересылает её в Telegram.
// Токен бота и номер чата лежат в секретах Cloudflare (BOT_TOKEN, CHAT_ID), на сайте их нет.

const ALLOWED_ORIGINS = [
  'https://agniyanet.ru',
  'https://www.agniyanet.ru',
  'https://learn-ambient-lamp.tilda.ws',
  'https://agnia777.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin'
    }
  });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: allowed ? 204 : 403,
        headers: {
          'Access-Control-Allow-Origin': allowed ? origin : 'null',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin'
        }
      });
    }
    if (!allowed) { return json({ ok: false, error: 'forbidden' }, 403, 'null'); }
    if (request.method !== 'POST') { return json({ ok: false, error: 'method' }, 405, origin); }
    if (!env.BOT_TOKEN || !env.CHAT_ID) { return json({ ok: false, error: 'not-configured' }, 500, origin); }

    let body;
    try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'bad-json' }, 400, origin); }

    const name = clean(body.name, 80);
    const phone = clean(body.phone, 30);
    const digits = phone.replace(/\D/g, '');
    if (name.length < 2) { return json({ ok: false, error: 'name' }, 400, origin); }
    if (digits.length < 10 || digits.length > 15) { return json({ ok: false, error: 'phone' }, 400, origin); }
    if (body.consent !== true) { return json({ ok: false, error: 'consent' }, 400, origin); }

    const lines = ['<b>Новая заявка с сайта</b>', '', 'Имя: ' + esc(name), 'Телефон: ' + esc(phone)];
    const niche = clean(body.niche, 40);
    const pack = clean(body.pack, 60);
    if (niche) { lines.push('Работает с: ' + esc(niche)); }
    if (pack) { lines.push('Интересует: ' + esc(pack)); }
    lines.push('', 'Согласие на обработку данных: да');
    const msk = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short' });
    lines.push('Время (МСК): ' + msk);

    const tg = await fetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.CHAT_ID,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    if (!tg.ok) { return json({ ok: false, error: 'telegram' }, 502, origin); }
    return json({ ok: true }, 200, origin);
  }
};
