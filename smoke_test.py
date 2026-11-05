import asyncio, os, sys
sys.path.insert(0, r"F:\mcp\finance\backend")

# Use a throwaway DB BEFORE importing app (engine is created at import).
DB = r"F:\mcp\finance\smoke_test.db"
for suffix in ("", "-wal", "-shm"):
    try: os.remove(DB + suffix)
    except FileNotFoundError: pass
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///" + DB.replace("\\", "/")

from app.main import app
from app.core.database import init_db, engine

from httpx import AsyncClient, ASGITransport

async def main():
    await init_db()
    transport = ASGITransport(app=app)
    results = []
    def log(name, ok, detail):
        results.append((name, ok, detail))

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        # 1. register
        r = await c.post("/api/auth/register", json={"email": "test@example.com", "password": "secret123", "name": "Test User"})
        log("register", r.status_code == 201, f"{r.status_code} {r.text[:120]}")

        # 2. login
        r = await c.post("/api/auth/login", data={"username": "test@example.com", "password": "secret123"})
        tok = r.json()
        log("login", r.status_code == 200 and "access_token" in tok, f"{r.status_code}")
        auth = {"Authorization": f"Bearer {tok.get('access_token','')}"}

        # 3. me
        r = await c.get("/api/auth/me", headers=auth)
        log("me", r.status_code == 200 and r.json().get("email") == "test@example.com", f"{r.status_code} {r.text[:120]}")

        # 4. categories (predefined)
        r = await c.get("/api/categories", headers=auth)
        cats = r.json()
        sys_cats = [x for x in cats if x.get("is_system") == 1]
        log("categories-predefined", r.status_code == 200 and len(sys_cats) == 10, f"total={len(cats)} sys={len(sys_cats)} sample_keys={sorted(cats[0].keys()) if cats else None}")

        # 5. create own expense category
        r = await c.post("/api/categories", headers=auth, json={"name": "Cafe", "icon": "coffee", "color": "#aabbcc", "type": "expense"})
        cafe = r.json()
        log("create-category", r.status_code == 201, f"{r.status_code} {r.text[:120]}")

        # 6. create expense tx
        r = await c.post("/api/transactions", headers=auth, json={"amount": 250.5, "description": "Coffee", "date": "2026-11-04T10:00:00", "category_id": cafe.get("id")})
        log("create-tx-expense", r.status_code == 201, f"{r.status_code} {r.text[:160]}")

        # 7. create income tx (salary category)
        salary = next(x for x in cats if x.get("name") == "Зарплата")
        r = await c.post("/api/transactions", headers=auth, json={"amount": 5000, "description": "Salary", "date": "2026-11-03T09:00:00", "category_id": salary.get("id")})
        log("create-tx-income", r.status_code == 201, f"{r.status_code} {r.text[:160]}")

        # 8. list with type filter
        r = await c.get("/api/transactions?type=income", headers=auth)
        data = r.json(); tc = r.headers.get("x-total-count")
        log("list-income", r.status_code == 200 and len(data) == 1 and float(data[0]["amount"]) == 5000, f"{r.status_code} n={len(data)} X-Total-Count={tc}")

        r = await c.get("/api/transactions?type=expense", headers=auth)
        data = r.json()
        log("list-expense", r.status_code == 200 and len(data) == 1 and float(data[0]["amount"]) == 250.5, f"{r.status_code} n={len(data)}")

        # 9. dashboard
        r = await c.get("/api/stats/dashboard", headers=auth)
        d = r.json()
        log("dashboard", r.status_code == 200 and abs(d["total_income"] - 5000) < 0.01 and abs(d["total_expense"] - 250.5) < 0.01 and abs(d["total_balance"] - 4749.5) < 0.01 and len(d["recent_transactions"]) == 2, f"{r.status_code} inc={d.get('total_income')} exp={d.get('total_expense')} bal={d.get('total_balance')} recent={len(d.get('recent_transactions',[]))}")

        # 10. by-category
        r = await c.get("/api/stats/by-category?period=month", headers=auth)
        log("by-category", r.status_code == 200 and isinstance(r.json(), list), f"{r.status_code} {r.text[:120]}")

        # 11. by-period
        r = await c.get("/api/stats/by-period?start=2026-11-01&end=2026-11-05", headers=auth)
        pdata = r.json()
        log("by-period", r.status_code == 200 and isinstance(pdata, list) and len(pdata) == 5, f"{r.status_code} n={len(pdata) if isinstance(pdata,list) else 'n/a'} {r.text[:120]}")

        # 12. export
        r = await c.get("/api/transactions/export", headers=auth)
        body_has_bom = r.text.startswith("\ufeff") or r.content[:3] == b"\xef\xbb\xbf"
        log("export", r.status_code == 200 and "date,type,amount" in r.text, f"{r.status_code} bom={body_has_bom} head={r.text[:60]!r}")

        # 13. delete category WITH tx -> 409
        r = await c.delete(f"/api/categories/{cafe.get('id')}", headers=auth)
        log("delete-cat-with-tx", r.status_code == 409, f"{r.status_code} {r.text[:120]}")

        # 14. delete predefined -> 404
        r = await c.delete(f"/api/categories/{salary.get('id')}", headers=auth)
        log("delete-predefined", r.status_code == 404, f"{r.status_code} {r.text[:120]}")

        # 15. unauthenticated -> 401
        r = await c.get("/api/transactions")
        log("no-auth-401", r.status_code == 401, f"{r.status_code}")

    await engine.dispose()
    for suffix in ("", "-wal", "-shm"):
        try: os.remove(DB + suffix)
        except FileNotFoundError: pass

    print("=== SMOKE TEST RESULTS ===")
    fails = 0
    for name, ok, detail in results:
        print(("PASS" if ok else "FAIL") + " | " + name + " | " + str(detail))
        if not ok: fails += 1
    print(f"=== {len(results)-fails}/{len(results)} passed ===")
    sys.exit(1 if fails else 0)

asyncio.run(main())
