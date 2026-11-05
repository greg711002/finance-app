import asyncio, sys
async def main():
    from app.core.database import init_db
    await init_db()
    print("init_db OK")
    try:
        import httpx
        print("httpx available", httpx.__version__)
    except ImportError as e:
        print("httpx MISSING", e)

    # Direct DB sanity: models import and table create
    from app.models import User, Category, Transaction, CategoryType
    print("models OK", [c.value for c in CategoryType])

asyncio.run(main())
