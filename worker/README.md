# Приём заявок в Telegram

Сайт лежит на GitHub Pages и сам отправить сообщение в Telegram безопасно не может: токен бота пришлось бы
положить в открытый код, и любой мог бы им воспользоваться. Поэтому между сайтом и Telegram стоит маленькая
программа (Cloudflare Worker, бесплатно). Токен хранится у неё в секретах.

## Один раз: настройка

1. **Бот.** В Telegram откройте @BotFather, команда `/newbot`, придумайте имя. Он выдаст токен вида `123456:ABC...`. Никому его не показывайте.
2. **Ваш chat id.** Откройте своего нового бота и нажмите «Start» (иначе он не сможет вам писать). Затем напишите боту @userinfobot: он ответит вашим числовым Id.
3. **Аккаунт Cloudflare.** Бесплатная регистрация на dash.cloudflare.com.
4. **Публикация программы.** В терминале, в папке `worker`:

```
npx wrangler login
npx wrangler deploy
npx wrangler secret put BOT_TOKEN
npx wrangler secret put CHAT_ID
```

   Команды `secret put` спросят значение: вставьте токен и chat id. В консоли они не отображаются.
5. После `deploy` wrangler напечатает адрес вида `https://soc-bez-semok-form.ИМЯ.workers.dev`. Вставьте его в `form.js` в поле `endpoint`.
6. Туда же впишите ваш ник в Telegram и телефон для кнопок связи.

## Проверка

```
curl -X POST https://soc-bez-semok-form.ИМЯ.workers.dev -H "Origin: https://agnia777.github.io" -H "Content-Type: application/json" -d "{\"name\":\"Тест\",\"phone\":\"+7 900 000-00-00\",\"consent\":true}"
```

В Telegram должно прийти сообщение «Новая заявка с сайта».

## Что умеет и чего не умеет

- Принимает заявки только с адресов из списка `ALLOWED_ORIGINS` в `worker.js` (сайт на Тильде, GitHub Pages и локальная проверка).
- Не хранит заявки: они остаются только в вашем Telegram.
- Если появится свой домен, добавьте его в `ALLOWED_ORIGINS` и снова выполните `npx wrangler deploy`.
