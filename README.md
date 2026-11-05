# Личные Финансы 🪙

Минималистичное приложение для учёта личных финансов: чистый интерфейс с акцентом
на данные и быструю навигацию. Пользователь чувствует контроль над своими деньгами
через наглядную визуализацию и простые действия.

## Стек

| Слой | Технологии |
|------|-----------|
| **Frontend** | React 18 + Vite, React Router, Recharts, Tailwind CSS, React Hook Form + Zod, Axios, PWA |
| **Backend** | FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic v2, JWT (python-jose), BCrypt, slowapi |

## Структура

```
backend/        FastAPI (Python)
  app/
    api/        auth, categories, transactions, stats
    core/       config, database, security, limiter
    models/     user, category, transaction
    schemas/    pydantic-схемы
  alembic/      миграции БД
frontend/       React + Vite (PWA)
  src/pages/    Dashboard, Transactions, AddTransaction, Categories,
                Reports, Analytics, Calculator, Login, Register, ResetPassword
```

## Запуск локально

### Backend
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate                 # Windows (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8080
```
- API: http://localhost:8080/api
- Swagger: http://localhost:8080/docs

### Frontend
```bash
cd frontend
npm install
npm run dev                            # http://localhost:5173
```

## Сборка
```bash
cd frontend
npm run build                          # → frontend/dist
```

## Тесты
```bash
python smoke_test.py                   # 16/16 smoke-тестов API
```

## Деплой

Frontend — статический PWA (Netlify / GitHub Pages), конфиг в `netlify.toml`.
Backend — отдельный хостинг (Render / Railway / Fly.io) с PostgreSQL.
Параметры окружения — в `.env.example`.

## Безопасность
- Пароли: BCrypt
- Токены: JWT access + refresh
- Rate limiting (slowapi), CORS, SQL-injection protected (SQLAlchemy)
