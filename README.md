# FPR Frontend

Frontend сайта [fpr.rufond.su](https://fpr.rufond.su/) — неофициального проекта о ЗПИФ «Фонд первичных размещений».

Приложение построено на Nuxt в режиме SPA и после сборки представляет собой статические файлы для nginx. Данные фонда загружаются из отдельного FPR Backend.

## Запуск

Требования:

- Node.js 24
- npm 10+

Установите зависимости и запустите dev-сервер:

```bash
npm install
npm run dev
```

По умолчанию dev proxy отправляет `/api` на `http://127.0.0.1:8080`. Другой backend можно указать через `FPR_BACKEND_URL`:

```bash
FPR_BACKEND_URL=http://127.0.0.1:8080 npm run dev
```

Проверка production-сборки и bundle budget:

```bash
npm run check
```

Production image собирается GitHub Actions и публикуется в `ghcr.io/rufond/fpr-frontend` только для version tags вида `v*.*.*`.
