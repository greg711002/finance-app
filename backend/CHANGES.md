# Изменения backend (доводка до SPEC.md)

## Что сделано

### Зависимости — `requirements.txt`
Полный согласованный набор: FastAPI 0.104.1, uvicorn[standard], SQLAlchemy 2.0.23,
asyncpg (PostgreSQL по SPEC), aiosqlite (dev-фолбэк), Alembic 1.13.1, Pydantic 2.4.2,
pydantic-settings, python-dotenv, email-validator, python-jose[cryptography],
passlib[bcrypt], bcrypt==4.0.1 (passlib 1.7.4 несовместим с bcrypt>=4.1 — версия закрыта),
python-multipart, slowapi.

### Конфигурация — `app/core/config.py`
- `Settings(BaseSettings)` читает `.env` (`case_sensitive=False`, `extra="ignore"`).
- `SECRET_KEY` из env; dev-дефолт помечен как НЕ-продакшн.
- `DATABASE_URL` (postgresql+asyncpg / sqlite+aiosqlite), `CORS_ORIGINS: List[str]`,
  `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`,
  `FRONTEND_ORIGIN`, `RESET_PASSWORD_URL`, `VERSION`.

### База данных — `app/core/database.py`
- `create_async_engine(settings.DATABASE_URL)`; для PostgreSQL — `pool_pre_ping`.
- Для SQLite включён `PRAGMA foreign_keys=ON` через `event.listens_for(..., "connect")`.
- `get_db` и `init_db` (create_all) сохранены.

### Безопасность — `app/core/security.py`
- `user_id = int(payload["sub"])` в try/except (убрано строковое сравнение).
- `datetime.now(timezone.utc)` вместо `datetime.utcnow()`.
- Проверка claim `type == "access"` в `get_current_user`.
- Токены access (`type: "access"`) и refresh (`type: "refresh"`) разделены.

### Auth — `app/api/auth.py`
- `register` → 201, rate-limit 5/мин по IP.
- `login` → `email.lower()`, rate-limit 5/мин.
- `refresh` → `int(sub)` в try/except, проверка claim `type == "refresh"`.
- Password-reset: НЕ возвращает token/reset_url в теле (только generic-сообщение);
  reset_url пишется через `print()` (в проде — mail); TTL 3600с + очистка просроченных
  (`_cleanup_reset_tokens`); `PasswordResetConfirm.new_password` min_length=6.
- При регистрации создаются 10 предопределённых категорий (копии на пользователя).

### Категории — `app/api/categories.py`
- Список: только свои + системные (`user_id IS NULL`).
- create → 201, проверка дубликата (`user_id, name`) → 409.
- update → проверка дубликата → 409.
- delete → 409, если у категории есть транзакции.
- В модели добавлен `UniqueConstraint("user_id", "name")`.

### Транзакции — `app/api/transactions.py`
- Исправлен фильтр `type`: сравнение через `CategoryType.INCOME/EXPENSE` (без второго join).
- `start_date`/`end_date` парсятся через try → 422 при неверном формате.
- IDOR: категория при create/update должна принадлежать пользователю или быть системной → 400.
- Заголовок `X-Total-Count` (общее число до offset/limit).
- `export` → CSV (`text/csv`, BOM `\ufeff`, колонки date,type,amount,category,description).
- create → 201; update применяет только переданные поля (`exclude_unset`).
- `TransactionResponse.type` ∈ {"income","expense",null}.

### Статистика — `app/api/stats.py`
- `dashboard`: income/expense ЗА ВСЁ ВРЕМЯ (float), balance = income − expense;
  разбивка по категориям и recent — за текущий месяц.
- `by-category`: `period` строго week/month/year → 422 иначе.
- НОВЫЙ `GET /stats/by-period?start=&end=` → `List[PeriodStats]` по дням включительно.

### Точка входа — `app/main.py`
- Подключён slowapi: `app.state.limiter`, обработчик `RateLimitExceeded`.
- CORS `allow_origins=settings.CORS_ORIGINS` (убраны wildcard и `allow_origin_regex`).
- Сохранены title/version/openapi_url/lifespan, 4 роутера с prefix=API_PREFIX, корневой
  и `/health` эндпоинты.

### Миграции — `alembic.ini`, `alembic/env.py`, `alembic/script.py.mako`, `alembic/versions/0001_initial.py`
- Async Alembic; `sqlalchemy.url` берётся из `settings.DATABASE_URL`.
- Начальная миграция: `users`, `categories`, `transactions` (соответствует моделям;
  `type` — `sa.Enum('INCOME','EXPENSE', name='categorytype')`, хранит ПО ИМЕНАМ).

## Как запускать

```bash
pip install -r requirements.txt
alembic upgrade head          # или init_db при старте (create_all)
uvicorn app.main:app --reload
```

## Что НЕ проверил (только код, без запуска)

- Импорты и фактический запуск сервера (не запускал, не устанавливал пакеты).
- Реальное применение миграции Alembic.
- Rate-limiting slowapi в рантайме (нужен `request: Request` — добавлен в лимитируемые роуты).
- Корректность `func.date()` для PostgreSQL vs SQLite (тип возврата day разный —
  обработано через `isinstance(day, str)`).

## Отклонения от SPEC (осознанно)

- Системные категории реализованы как ПЕРСОНАЛЬНЫЕ копии (`is_system=1, user_id=user.id`)
  плюс потенциально глобальные `user_id IS NULL` в выборке, а не чистые глобальные
  справочные строки.
