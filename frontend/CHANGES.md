# CHANGES — Доработка frontend «Личные Финансы» до SPEC

## Сводка

Frontend приведён в соответствие со SPEC.md и контрактом бэкенда. Рабочая копия: `F:\mcp\finance\frontend`.
Сборку (`npm i`, `vite build`) выполняет Lead — здесь только правки исходников.

## Конфигурация и инфраструктура

- **package.json** — добавлены `@hookform/resolvers@^3.3.4` и `zod@^3.22.4` (RHF+Zod валидация форм по SPEC).
- **vite.config.js** — `includeAssets=[apple-touch-icon.png]` (убраны несуществующие favicon.ico/mask-icon.svg); `manifest.icons` исправлены (192/512/maskable корректно указывают на реальные SVG).
- **index.html** — favicon → `/pwa-192x192.svg` (был 404 на /vite.svg), `lang="ru"`, Inter 400–800.
- **tailwind.config.js / index.css / main.jsx** — дизайн-токены already есть (primary/secondary/accent/success/danger), used по всем страницам вместо сырых green/red. Без изменений.

## Страницы и компоненты

- **src/api/index.js** — дедупликация refresh: общий `refreshPromise` (один in-flight refresh при параллельных 401), очистка токенов + redirect `/login` при отсутствии refresh_token.
- **src/App.jsx** — роуты `/reports` + 404 (`NotFound`) + `PWAPrompt`; public-роуты редиректят авторизованных на `/`.
- **Dashboard.jsx** — LineChart (income/expense) из `/stats/by-period`, `recent_transactions.slice(0,5)`, доход по `tx.type` вместо хардкода имён.
- **Transactions.jsx** — lucide-иконки (компоненты, не emoji/функции), debounce поиска 350 мс, фильтры type/category_id/date_from/date_to, CSV-экспорт (blob из `GET /transactions/export`), пагинация по `X-Total-Count`.
- **Analytics.jsx** — `import TrendingFlat` (фикс ReferenceError), mock удалён, real `/stats/by-period`, клиентское сравнение периодов.
- **AddTransaction.jsx** — RHF+Zod; дата шлётся `YYYY-MM-DD` напрямую (фикс сдвига дня в отрицательных поясах), `parseFloat` с NaN-проверкой, плашка «Нет категорий типа…».
- **Categories.jsx** — RHF+Zod; системные/свои категории определяются по полю `is_system` (1 — системные копии, 0 — свои); lucide-иконки как компоненты; модалка `role="dialog" aria-modal aria-labelledby` + Escape + focus; error detail с проверкой типа.
- **Login.jsx / Register.jsx** — RHF+Zod, валидация в реальном времени (`mode:"onChange"`), autoComplete, serverError отдельно.
- **Calculator.jsx** — `eval()` убран → безопасный рекурсивный парсер `evaluateExpression`.
- **ResetPassword.jsx** — убрана утечка resetUrl из UI, `timeoutRef` + cleanup.
- **Layout.jsx** (полная переписка) — пункт меню `/reports`, desktop-header с bell (бейдж `bg-accent`) и профилем (инициалы из `user.name`), сворачиваемый sidebar (`lg:w-20 ↔ lg:w-64`, persist в `localStorage("sidebar-collapsed")`), aria-label на икон-кнопках, mobile-бургер сохранён.
- **Reports.jsx** (новый) — периоды неделя/месяц/год/произвольный(start-end), группировка по категориям (`/stats/by-category`), сравнение периодов (`/stats/by-period` клиентски), топ расходов, итоги доход/расход/баланс.

## Остаточные риски (не блокируют, на усмотрение бэкенда/Lead)

1. Эндпоинты `/stats/by-category` и `/stats/by-period` должны возвращать массивы. Формат полей by-category: `category_id`, `category_name`, `category_color`, `category_icon`, `total`, `count` (by-period: `date`, `income`, `expense`).
2. Ответ `/categories` должен содержать `type`, `icon`, `color`, `user_id` и `is_system` (1 — системные, 0 — свои).
3. `X-Total-Count` заголовок обязателен для пагинации Transactions; без него — только 1 страница.
4. `GET /transactions/export` должен возвращать CSV (`responseType:"blob"` на клиенте).
5. Палитра категорий содержит цвета вне SPEC (#8b5cf6, #ec4899 и др.) — оставлены как пользовательский выбор цвета категории (не дизайн-система, а функциональность).
