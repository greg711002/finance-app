// netlify/functions/api.mjs
// Node ESM port of the FastAPI backend for the personal-finance app.
// Runs as a Netlify Function v2 over Netlify Database (PostgreSQL).

let _pool = null;

async function getPool() {
  if (_pool) return _pool;
  let conn = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!conn) {
    try {
      const mod = await import("@netlify/database");
      const fn = mod.getConnectionString || (mod.default && mod.default.getConnectionString);
      if (typeof fn === "function") conn = fn();
    } catch (e) { /* ignore */ }
  }
  if (!conn) throw new Error("NETLIFY_DB_URL is not configured");
  const pgMod = await import("pg");
  const PgPool = (pgMod.default && pgMod.default.Pool) || pgMod.Pool;
  _pool = new PgPool({ connectionString: conn, max: 5, ssl: { rejectUnauthorized: false } });
  return _pool;
}

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-secret-key-do-not-use-in-production-0123456789"
);
const ALG = "HS256";

const DEFAULT_CATEGORIES = [
  { name: "Зарплата", icon: "briefcase", color: "#10b981", type: "income" },
  { name: "Фриланс", icon: "laptop", color: "#6366f1", type: "income" },
  { name: "Инвестиции", icon: "trending-up", color: "#8b5cf6", type: "income" },
  { name: "Продукты", icon: "shopping-cart", color: "#f59e0b", type: "expense" },
  { name: "Транспорт", icon: "car", color: "#ef4444", type: "expense" },
  { name: "Жильё", icon: "home", color: "#3b82f6", type: "expense" },
  { name: "Развлечения", icon: "film", color: "#ec4899", type: "expense" },
  { name: "Здоровье", icon: "heart", color: "#14b8a6", type: "expense" },
  { name: "Одежда", icon: "shirt", color: "#f97316", type: "expense" },
  { name: "Образование", icon: "book", color: "#06b6d4", type: "expense" },
];

function json(data, status, extra) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json" }, extra || {}),
  });
}
function fail(status, detail, extra) {
  return json({ detail: detail }, status, extra);
}

function toFloat(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}
function iso(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? String(d) : parsed.toISOString();
}
function dayStart(s) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T00:00:00.000Z");
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function dayEnd(s) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T23:59:59.999Z");
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function readBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (ct.indexOf("multipart/form-data") !== -1) {
    const fd = await req.formData();
    const obj = {};
    for (const pair of fd.entries()) {
      const k = pair[0], v = pair[1];
      obj[k] = typeof v === "string" ? v : v.name;
    }
    return obj;
  }
  if (ct.indexOf("application/x-www-form-urlencoded") !== -1) {
    const txt = await req.text();
    const sp = new URLSearchParams(txt);
    const obj = {};
    for (const pair of sp.entries()) obj[pair[0]] = pair[1];
    return obj;
  }
  try { return await req.json(); } catch (e) { return {}; }
}

async function hashPassword(pw) {
  const bcryptMod = await import("bcryptjs");
  const bcrypt = bcryptMod.default || bcryptMod;
  return bcrypt.hash(pw, 10);
}
async function checkPassword(pw, hash) {
  const bcryptMod = await import("bcryptjs");
  const bcrypt = bcryptMod.default || bcryptMod;
  return bcrypt.compare(pw, hash);
}

async function signToken(payload, expiresIn) {
  const jose = await import("jose");
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}
async function verifyToken(token) {
  try {
    const jose = await import("jose");
    const res = await jose.jwtVerify(token, SECRET, { algorithms: [ALG] });
    return res.payload;
  } catch (e) {
    return null;
  }
}

async function issueTokens(userId) {
  const sub = String(userId);
  const access_token = await signToken({ sub: sub, type: "access" }, "30m");
  const refresh_token = await signToken({ sub: sub, type: "refresh" }, "7d");
  return { access_token: access_token, refresh_token: refresh_token, token_type: "bearer" };
}

async function currentUser(req, pool) {
  const hdr = req.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(hdr);
  if (!m) return { error: fail(401, "Could not validate credentials", { "WWW-Authenticate": "Bearer" }) };
  const payload = await verifyToken(m[1].trim());
  if (!payload || payload.type !== "access") {
    return { error: fail(401, "Could not validate credentials", { "WWW-Authenticate": "Bearer" }) };
  }
  const uid = parseInt(payload.sub, 10);
  if (!Number.isFinite(uid)) {
    return { error: fail(401, "Could not validate credentials", { "WWW-Authenticate": "Bearer" }) };
  }
  const r = await pool.query("SELECT id, email, name, created_at FROM users WHERE id = $1", [uid]);
  if (r.rows.length === 0) {
    return { error: fail(401, "Could not validate credentials", { "WWW-Authenticate": "Bearer" }) };
  }
  return { user: r.rows[0] };
}

function userOut(u) {
  return { id: Number(u.id), email: u.email, name: u.name, created_at: iso(u.created_at) };
}
function categoryOut(c) {
  return {
    name: c.name,
    icon: c.icon,
    color: c.color,
    type: c.type,
    id: Number(c.id),
    user_id: c.user_id === null ? null : Number(c.user_id),
    is_system: Number(c.is_system || 0),
    created_at: iso(c.created_at),
  };
}
function txOut(t) {
  return {
    id: Number(t.id),
    user_id: Number(t.user_id),
    amount: t.amount === null || t.amount === undefined ? null : String(t.amount),
    description: t.description,
    date: iso(t.date),
    category_id: t.category_id === null ? null : Number(t.category_id),
    created_at: iso(t.created_at),
    category_name: t.category_name === undefined ? null : t.category_name,
    category_color: t.category_color === undefined ? null : t.category_color,
    category_icon: t.category_icon === undefined ? null : t.category_icon,
    type: t.category_type === undefined ? null : t.category_type,
  };
}

const TX_SELECT = [
  "SELECT t.id, t.user_id, t.amount, t.description, t.date, t.category_id, t.created_at,",
  "       c.name AS category_name, c.color AS category_color, c.icon AS category_icon, c.type AS category_type",
  "FROM transactions t LEFT JOIN categories c ON c.id = t.category_id",
].join(" ");

function buildTxWhere(uid, q) {
  const params = [uid];
  const conds = ["t.user_id = $1"];
  const fromRaw = q.get("date_from") || q.get("start_date") || "";
  const toRaw = q.get("date_to") || q.get("end_date") || "";
  if (fromRaw) {
    const d = dayStart(fromRaw);
    if (!d) return { error: "Неверный формат даты (ожидается ISO)" };
    params.push(d);
    conds.push("t.date >= $" + params.length);
  }
  if (toRaw) {
    const d = dayEnd(toRaw);
    if (!d) return { error: "Неверный формат даты (ожидается ISO)" };
    params.push(d);
    conds.push("t.date <= $" + params.length);
  }
  const catId = q.get("category_id");
  if (catId) {
    const n = parseInt(catId, 10);
    if (!Number.isFinite(n)) return { error: "Неверный параметр category_id" };
    params.push(n);
    conds.push("t.category_id = $" + params.length);
  }
  const ty = q.get("type");
  if (ty) {
    if (ty !== "income" && ty !== "expense") return { error: "Параметр type должен быть 'income' или 'expense'" };
    params.push(ty);
    conds.push("c.type = $" + params.length);
  }
  const search = q.get("search");
  if (search) {
    params.push("%" + search + "%");
    conds.push("t.description ILIKE $" + params.length);
  }
  return { params: params, where: conds.join(" AND ") };
}

async function handle(req) {
  const url = new URL(req.url);
  let path = url.pathname
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api/, "");
  if (!path) path = "/";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

  const method = req.method.toUpperCase();
  const q = url.searchParams;

  if (path === "/health") return json({ status: "ok" });

  const pool = await getPool();

  // ---------- auth ----------
  if (path === "/auth/register" && method === "POST") {
    const b = await readBody(req);
    const email = String(b.email || "").trim().toLowerCase();
    const name = String(b.name || "").trim();
    const password = String(b.password || "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(422, "Некорректный email");
    if (!name) return fail(422, "Имя обязательно");
    if (password.length < 6) return fail(422, "Пароль должен содержать минимум 6 символов");
    const dup = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (dup.rows.length > 0) return fail(400, "Email already registered");
    const hash = await hashPassword(password);
    const created = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at",
      [email, hash, name]
    );
    const user = created.rows[0];
    const values = [];
    const parts = [];
    DEFAULT_CATEGORIES.forEach(function (c, i) {
      const base = i * 5;
      parts.push("($" + (base + 1) + ", $" + (base + 2) + ", $" + (base + 3) + ", $" + (base + 4) + ", $" + (base + 5) + ", 1)");
      values.push(user.id, c.name, c.icon, c.color, c.type);
    });
    await pool.query(
      "INSERT INTO categories (user_id, name, icon, color, type, is_system) VALUES " + parts.join(", "),
      values
    );
    return json(userOut(user), 201);
  }

  if (path === "/auth/login" && method === "POST") {
    const b = await readBody(req);
    const email = String(b.username || b.email || "").trim().toLowerCase();
    const password = String(b.password || "");
    const r = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (r.rows.length === 0) {
      return fail(401, "Incorrect email or password", { "WWW-Authenticate": "Bearer" });
    }
    const user = r.rows[0];
    const ok = await checkPassword(password, user.password_hash);
    if (!ok) return fail(401, "Incorrect email or password", { "WWW-Authenticate": "Bearer" });
    return json(await issueTokens(user.id));
  }

  if (path === "/auth/refresh" && method === "POST") {
    const b = await readBody(req);
    const token = b.refresh_token;
    if (!token) return fail(401, "Invalid refresh token");
    const payload = await verifyToken(String(token));
    if (!payload || payload.type !== "refresh") return fail(401, "Invalid refresh token");
    const uid = parseInt(payload.sub, 10);
    if (!Number.isFinite(uid)) return fail(401, "Invalid token");
    const r = await pool.query("SELECT id FROM users WHERE id = $1", [uid]);
    if (r.rows.length === 0) return fail(401, "User not found");
    return json(await issueTokens(uid));
  }

  if (path === "/auth/password-reset" && method === "POST") {
    return json({ message: "Если email зарегистрирован, ссылка для сброса пароля будет отправлена" });
  }
  if (path === "/auth/password-reset/confirm" && method === "POST") {
    return fail(400, "Недействительный токен");
  }

  // ---------- authenticated ----------
  const auth = await currentUser(req, pool);
  if (auth.error) return auth.error;
  const me = auth.user;

  if (path === "/auth/me" && method === "GET") return json(userOut(me));

  // ---------- categories ----------
  if (path === "/categories" && method === "GET") {
    const r = await pool.query(
      "SELECT id, user_id, name, icon, color, type, is_system, created_at FROM categories " +
        "WHERE user_id = $1 OR user_id IS NULL ORDER BY is_system DESC, name ASC",
      [me.id]
    );
    return json(r.rows.map(categoryOut));
  }

  if (path === "/categories" && method === "POST") {
    const b = await readBody(req);
    const name = String(b.name || "").trim();
    const type = String(b.type || "");
    const icon = String(b.icon || "wallet");
    const color = String(b.color || "#2563eb");
    if (!name) return fail(422, "Имя категории обязательно");
    if (type !== "income" && type !== "expense") return fail(422, "Тип должен быть 'income' или 'expense'");
    const dup = await pool.query("SELECT id FROM categories WHERE user_id = $1 AND name = $2", [me.id, name]);
    if (dup.rows.length > 0) return fail(409, "Категория с таким именем уже существует");
    const r = await pool.query(
      "INSERT INTO categories (user_id, name, icon, color, type, is_system) VALUES ($1, $2, $3, $4, $5, 0) " +
        "RETURNING id, user_id, name, icon, color, type, is_system, created_at",
      [me.id, name, icon, color, type]
    );
    return json(categoryOut(r.rows[0]), 201);
  }

  const catMatch = /^\/categories\/(\d+)$/.exec(path);
  if (catMatch) {
    const cid = parseInt(catMatch[1], 10);
    if (method === "PUT") {
      const own = await pool.query(
        "SELECT * FROM categories WHERE id = $1 AND user_id = $2 AND is_system = 0",
        [cid, me.id]
      );
      if (own.rows.length === 0) return fail(404, "Category not found or cannot be modified");
      const cur = own.rows[0];
      const b = await readBody(req);
      const name = b.name === undefined || b.name === null ? cur.name : String(b.name).trim();
      const icon = b.icon === undefined || b.icon === null ? cur.icon : String(b.icon);
      const color = b.color === undefined || b.color === null ? cur.color : String(b.color);
      const type = b.type === undefined || b.type === null ? cur.type : String(b.type);
      if (type !== "income" && type !== "expense") return fail(422, "Тип должен быть 'income' или 'expense'");
      if (name !== cur.name) {
        const dup = await pool.query(
          "SELECT id FROM categories WHERE user_id = $1 AND name = $2 AND id <> $3",
          [me.id, name, cid]
        );
        if (dup.rows.length > 0) return fail(409, "Категория с таким именем уже существует");
      }
      const r = await pool.query(
        "UPDATE categories SET name = $1, icon = $2, color = $3, type = $4 WHERE id = $5 " +
          "RETURNING id, user_id, name, icon, color, type, is_system, created_at",
        [name, icon, color, type, cid]
      );
      return json(categoryOut(r.rows[0]));
    }
    if (method === "DELETE") {
      const own = await pool.query(
        "SELECT id FROM categories WHERE id = $1 AND user_id = $2 AND is_system = 0",
        [cid, me.id]
      );
      if (own.rows.length === 0) return fail(404, "Category not found or cannot be deleted");
      const used = await pool.query("SELECT COUNT(*)::int AS cnt FROM transactions WHERE category_id = $1", [cid]);
      if (used.rows[0].cnt > 0) return fail(409, "Нельзя удалить категорию, у которой есть транзакции");
      await pool.query("DELETE FROM categories WHERE id = $1", [cid]);
      return json({ message: "Category deleted" });
    }
  }

  // ---------- transactions ----------
  if (path === "/transactions/export" && method === "GET") {
    const built = buildTxWhere(me.id, q);
    if (built.error) return fail(422, built.error);
    const sql = TX_SELECT + " WHERE " + built.where + " ORDER BY t.date DESC, t.id DESC";
    const r = await pool.query(sql, built.params);
    const lines = ["date,type,amount,category,description"];
    r.rows.forEach(function (t) {
      const d = t.date instanceof Date ? t.date.toISOString().slice(0, 10) : String(t.date).slice(0, 10);
      const cells = [
        d,
        t.category_type || "",
        String(t.amount),
        t.category_name || "",
        t.description || "",
      ].map(function (v) {
        const s = String(v);
        return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      });
      lines.push(cells.join(","));
    });
    const body = "\uFEFF" + lines.join("\r\n") + "\r\n";
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="transactions.csv"',
      },
    });
  }

  if (path === "/transactions" && method === "GET") {
    const built = buildTxWhere(me.id, q);
    if (built.error) return fail(422, built.error);
    let limit = parseInt(q.get("limit") || "50", 10);
    if (!Number.isFinite(limit)) limit = 50;
    limit = Math.max(1, Math.min(100, limit));
    let offset = parseInt(q.get("offset") || "0", 10);
    if (!Number.isFinite(offset) || offset < 0) offset = 0;

    const countRes = await pool.query(
      "SELECT COUNT(*)::int AS cnt FROM transactions t LEFT JOIN categories c ON c.id = t.category_id WHERE " + built.where,
      built.params
    );
    const total = countRes.rows[0].cnt;
    const pageParams = built.params.slice();
    pageParams.push(limit);
    const limitIdx = pageParams.length;
    pageParams.push(offset);
    const offsetIdx = pageParams.length;
    const sql = TX_SELECT + " WHERE " + built.where +
      " ORDER BY t.date DESC, t.id DESC LIMIT $" + limitIdx + " OFFSET $" + offsetIdx;
    const r = await pool.query(sql, pageParams);
    return json(r.rows.map(txOut), 200, { "X-Total-Count": String(total) });
  }

  if (path === "/transactions" && method === "POST") {
    const b = await readBody(req);
    const amountNum = parseFloat(b.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return fail(422, "amount: ensure this value is greater than 0");
    if (!b.date) return fail(422, "date: field required");
    const dateVal = dayStart(String(b.date));
    if (!dateVal) return fail(422, "Неверный формат даты (ожидается ISO)");
    let categoryId = null;
    if (b.category_id !== undefined && b.category_id !== null && b.category_id !== "") {
      categoryId = parseInt(b.category_id, 10);
      if (!Number.isFinite(categoryId)) return fail(422, "Неверный параметр category_id");
      const own = await pool.query(
        "SELECT id FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)",
        [categoryId, me.id]
      );
      if (own.rows.length === 0) return fail(400, "Категория не найдена или не принадлежит вам");
    }
    const description = b.description === undefined || b.description === null || String(b.description).trim() === ""
      ? null
      : String(b.description).trim();
    const ins = await pool.query(
      "INSERT INTO transactions (user_id, category_id, amount, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [me.id, categoryId, amountNum.toFixed(2), description, dateVal]
    );
    const created = await pool.query(TX_SELECT + " WHERE t.id = $1", [ins.rows[0].id]);
    return json(txOut(created.rows[0]), 201);
  }

  const txMatch = /^\/transactions\/(\d+)$/.exec(path);
  if (txMatch) {
    const tid = parseInt(txMatch[1], 10);
    const own = await pool.query("SELECT * FROM transactions WHERE id = $1 AND user_id = $2", [tid, me.id]);
    if (own.rows.length === 0) return fail(404, "Transaction not found");
    if (method === "GET") {
      const r = await pool.query(TX_SELECT + " WHERE t.id = $1", [tid]);
      return json(txOut(r.rows[0]));
    }
    if (method === "PUT") {
      const b = await readBody(req);
      const cur = own.rows[0];
      let amount = cur.amount;
      if (b.amount !== undefined && b.amount !== null) {
        const n = parseFloat(b.amount);
        if (!Number.isFinite(n) || n <= 0) return fail(422, "amount: ensure this value is greater than 0");
        amount = n.toFixed(2);
      }
      let description = cur.description;
      if (b.description !== undefined) {
        description = b.description === null || String(b.description).trim() === "" ? null : String(b.description).trim();
      }
      let dateVal = cur.date;
      if (b.date !== undefined && b.date !== null) {
        const d = dayStart(String(b.date));
        if (!d) return fail(422, "Неверный формат даты (ожидается ISO)");
        dateVal = d;
      }
      let categoryId = cur.category_id;
      if (b.category_id !== undefined) {
        if (b.category_id === null || b.category_id === "") {
          categoryId = null;
        } else {
          const n = parseInt(b.category_id, 10);
          if (!Number.isFinite(n)) return fail(422, "Неверный параметр category_id");
          const okc = await pool.query(
            "SELECT id FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)",
            [n, me.id]
          );
          if (okc.rows.length === 0) return fail(400, "Категория не найдена или не принадлежит вам");
          categoryId = n;
        }
      }
      await pool.query(
        "UPDATE transactions SET amount = $1, description = $2, date = $3, category_id = $4 WHERE id = $5",
        [amount, description, dateVal, categoryId, tid]
      );
      const r = await pool.query(TX_SELECT + " WHERE t.id = $1", [tid]);
      return json(txOut(r.rows[0]));
    }
    if (method === "DELETE") {
      await pool.query("DELETE FROM transactions WHERE id = $1", [tid]);
      return json({ message: "Transaction deleted" });
    }
  }

  // ---------- stats ----------
  if (path === "/stats/dashboard" && method === "GET") {
    const totals = await pool.query(
      "SELECT COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount END), 0) AS income, " +
        "COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount END), 0) AS expense " +
        "FROM transactions t INNER JOIN categories c ON c.id = t.category_id WHERE t.user_id = $1",
      [me.id]
    );
    const income = toFloat(totals.rows[0].income);
    const expense = toFloat(totals.rows[0].expense);

    const recent = await pool.query(
      TX_SELECT + " WHERE t.user_id = $1 ORDER BY t.date DESC, t.id DESC LIMIT 5",
      [me.id]
    );
    const recentOut = recent.rows.map(function (t) {
      return {
        id: Number(t.id),
        amount: toFloat(t.amount),
        description: t.description,
        date: iso(t.date),
        category_name: t.category_name === undefined ? null : t.category_name,
        category_color: t.category_color === undefined ? null : t.category_color,
        category_icon: t.category_icon === undefined ? null : t.category_icon,
        type: t.category_type === undefined ? null : t.category_type,
      };
    });

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const byType = async function (txType) {
      const r = await pool.query(
        "SELECT c.id, c.name, c.color, c.icon, SUM(t.amount) AS total " +
          "FROM transactions t INNER JOIN categories c ON c.id = t.category_id " +
          "WHERE t.user_id = $1 AND t.date >= $2 AND c.type = $3 " +
          "GROUP BY c.id, c.name, c.color, c.icon ORDER BY total DESC",
        [me.id, monthStart, txType]
      );
      return r.rows.map(function (row) {
        return {
          id: Number(row.id),
          name: row.name,
          color: row.color,
          icon: row.icon,
          value: toFloat(row.total),
        };
      });
    };
    const expensesByCategory = await byType("expense");
    const incomeByCategory = await byType("income");

    return json({
      total_balance: income - expense,
      total_income: income,
      total_expense: expense,
      recent_transactions: recentOut,
      expenses_by_category: expensesByCategory,
      income_by_category: incomeByCategory,
    });
  }

  if (path === "/stats/by-category" && method === "GET") {
    const period = q.get("period") || "month";
    const now = new Date();
    let startDate;
    if (period === "week") startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === "month") startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    else if (period === "year") startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    else return fail(422, "Параметр period должен быть 'week', 'month' или 'year'");
    const r = await pool.query(
      "SELECT c.id AS category_id, c.name AS category_name, c.color AS category_color, " +
        "c.icon AS category_icon, SUM(t.amount) AS total, COUNT(t.id)::int AS cnt " +
        "FROM transactions t INNER JOIN categories c ON c.id = t.category_id " +
        "WHERE t.user_id = $1 AND t.date >= $2 " +
        "GROUP BY c.id, c.name, c.color, c.icon ORDER BY total DESC",
      [me.id, startDate]
    );
    return json(r.rows.map(function (row) {
      return {
        category_id: Number(row.category_id),
        category_name: row.category_name,
        category_color: row.category_color,
        category_icon: row.category_icon,
        total: toFloat(row.total),
        count: Number(row.cnt),
      };
    }));
  }

  if (path === "/stats/by-period" && method === "GET") {
    const startRaw = q.get("start");
    const endRaw = q.get("end");
    const dayRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!startRaw || !endRaw || !dayRe.test(startRaw) || !dayRe.test(endRaw)) {
      return fail(422, "Параметры start и end должны быть в формате YYYY-MM-DD");
    }
    const startDate = dayStart(startRaw);
    const endDate = dayEnd(endRaw);
    if (!startDate || !endDate) return fail(422, "Параметры start и end должны быть в формате YYYY-MM-DD");
    if (startDate.getTime() > endDate.getTime()) return fail(422, "start не может быть позже end");
    const r = await pool.query(
      "SELECT to_char(t.date AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS d, c.type, SUM(t.amount) AS total " +
        "FROM transactions t INNER JOIN categories c ON c.id = t.category_id " +
        "WHERE t.user_id = $1 AND t.date >= $2 AND t.date <= $3 " +
        "GROUP BY d, c.type",
      [me.id, startDate, endDate]
    );
    const map = new Map();
    r.rows.forEach(function (row) {
      map.set(row.d + "|" + row.type, toFloat(row.total));
    });
    const out = [];
    const cursor = new Date(startDate.getTime());
    const lastKey = endRaw;
    let guard = 0;
    while (guard < 4000) {
      guard += 1;
      const key = cursor.toISOString().slice(0, 10);
      out.push({
        date: key,
        income: map.get(key + "|income") || 0,
        expense: map.get(key + "|expense") || 0,
      });
      if (key >= lastKey) break;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return json(out);
  }

  return fail(404, "Not Found");
}

export default async function handler(req, context) {
  try {
    return await handle(req);
  } catch (err) {
    console.error("api error:", err && err.stack ? err.stack : err);
    return fail(500, "Internal server error");
  }
}

export const config = { path: "/api/*" };
