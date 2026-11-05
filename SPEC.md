# Личные Финансы — Спецификация

## Концепция и Видение

Минималистичное, но функциональное приложение для учёта личных финансов. Чистый интерфейс с акцентом на данные и быструю навигацию. Пользователь чувствует контроль над своими деньгами через наглядную визуализацию и простые действия.

## Дизайн-система

### Цветовая палитра
- Primary: `#2563eb` (синий)
- Primary Dark: `#1d4ed8`
- Secondary: `#0f172a` (тёмно-синий)
- Accent: `#f59e0b` (жёлтый)
- Background: `#f8fafc`
- Card Background: `#ffffff`
- Text: `#334155`
- Text Light: `#64748b`
- Success: `#10b981`
- Danger: `#ef4444`

### Типографика
- Font: Inter
- Headings: 700-800 weight
- Body: 400-500 weight

### Компоненты
- Карточки с тенями и hover-эффектами
- Кнопки с градиентами и анимациями
- Графики с плавными transitions
- Формы с валидацией в реальном времени

## Структура

### Страницы
1. **Авторизация** — Login / Register
2. **Dashboard** — Обзор финансов (баланс, доходы/расходы за месяц, графики)
3. **Транзакции** — Список всех операций с фильтрами
4. **Добавить транзакцию** — Форма добавления дохода/расхода
5. **Категории** — Управление категориями
6. **Отчёты** — Детальная аналитика по периодам

### Layout
- Sidebar навигация (сворачиваемая на мобильных)
- Header с профилем и уведомлениями
- Контент с карточками и сеткой

## Функциональность

### Авторизация
- JWT-аутентификация
- Refresh tokens
- Защищённые маршруты

### Dashboard
- Карточка баланса (общий, доходы, расходы)
- График расходов по категориям ( Doughnut)
- График динамики (Line chart)
- Последние транзакции (5 штук)
- Быстрое добавление транзакции

### Транзакции
- CRUD операции
- Фильтрация по дате, категории, типу
- Поиск по описанию
- Пагинация
- Экспорт в CSV

### Категории
- Предопределённые категории (Еда, Транспорт, Жильё, etc.)
- Создание своих категорий
- Иконки и цвета для категорий
- Ограничение: нельзя удалить категорию с транзакциями

### Отчёты
- Выбор периода (неделя, месяц, год, произвольный)
- Группировка по категориям
- Сравнение периодов
- Топ расходов

## Технический стек

### Frontend
- React 18 + Vite
- React Router
- Recharts для графиков
- Tailwind CSS
- React Hook Form + Zod
- Axios

### Backend
- FastAPI (Python)
- PostgreSQL + SQLAlchemy (async)
- Alembic для миграций
- Pydantic для валидации
- JWT (python-jose)
- BCrypt для паролей

### API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me

GET    /api/transactions
POST   /api/transactions
GET    /api/transactions/{id}
PUT    /api/transactions/{id}
DELETE /api/transactions/{id}

GET    /api/categories
POST   /api/categories
PUT    /api/categories/{id}
DELETE /api/categories/{id}

GET    /api/stats/dashboard
GET    /api/stats/by-category?period=
GET    /api/stats/by-period?start=&end=
```

## Модели данных

### User
- id, email, password_hash, name, created_at

### Category
- id, user_id (nullable для системных), name, icon, color, type (income/expense)

### Transaction
- id, user_id, category_id, amount, description, date, created_at

## Безопасность
- HTTPS-only
- Rate limiting
- CORS настроен
- SQL injection protection (SQLAlchemy)
- XSS protection
