#!/usr/bin/env node
/* Kitchener Plumbing Pros concept site: static pages + booking backend.
   No dependencies. Node 18 or newer.

     node server.js                      http://localhost:3000

   Storage: SQLite through node:sqlite where the runtime has it (Node 22.5+),
   otherwise a JSON file. Either way it lives in ./data and is created on
   first run.

   Environment (also read from a .env file beside this script):
     PORT             default 3000
     HOST             default 127.0.0.1 (set 0.0.0.0 to accept outside traffic)
     ADMIN_USER       default "office"
     ADMIN_PASSWORD   required to enable /admin. No default on purpose.
     NOTIFY_WEBHOOK   optional https URL that receives each new request as JSON
     TRUST_PROXY      set to 1 behind a reverse proxy to read X-Forwarded-For
*/
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");

// ---------------------------------------------------------------- config --
(function loadEnv() {
  const f = path.join(ROOT, ".env");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
})();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const ADMIN_USER = process.env.ADMIN_USER || "office";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const NOTIFY_WEBHOOK = process.env.NOTIFY_WEBHOOK || "";
const TRUST_PROXY = process.env.TRUST_PROXY === "1";

const PROBLEMS = ["A leak or a burst pipe", "A blocked drain", "No hot water", "A bathroom or kitchen job", "Basement, laundry or outdoors", "It's for my business"];
const WHEN = ["As soon as possible", "Today", "This week", "Just a quote for now"];
const STATUSES = ["new", "called", "booked", "done", "closed"];

// --------------------------------------------------------------- storage --
fs.mkdirSync(DATA, { recursive: true });
function openStore() {
  try {
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(path.join(DATA, "bookings.sqlite"));
    db.exec(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL,
      name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', problem TEXT NOT NULL,
      "when" TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', page TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new', note TEXT NOT NULL DEFAULT '')`);
    const ins = db.prepare(`INSERT INTO bookings (reference, created_at, name, phone, email, problem, "when", details, page) VALUES (?,?,?,?,?,?,?,?,?)`);
    return {
      kind: "sqlite",
      add: (b) => { ins.run(b.reference, b.created_at, b.name, b.phone, b.email, b.problem, b.when, b.details, b.page); },
      all: () => db.prepare(`SELECT * FROM bookings ORDER BY id DESC`).all(),
      update: (ref, status, note) => db.prepare(`UPDATE bookings SET status = ?, note = ? WHERE reference = ?`).run(status, note, ref).changes > 0,
    };
  } catch {
    const file = path.join(DATA, "bookings.json");
    const read = () => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : []);
    const write = (rows) => { fs.writeFileSync(file + ".tmp", JSON.stringify(rows, null, 2)); fs.renameSync(file + ".tmp", file); };
    return {
      kind: "json",
      add: (b) => { const rows = read(); rows.push({ id: rows.length + 1, status: "new", note: "", ...b }); write(rows); },
      all: () => read().reverse(),
      update: (ref, status, note) => { const rows = read(); const r = rows.find((x) => x.reference === ref); if (!r) return false; r.status = status; r.note = note; write(rows); return true; },
    };
  }
}
const store = openStore();

// --------------------------------------------------------------- helpers --
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon" };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
const clientIp = (req) => (TRUST_PROXY && req.headers["x-forwarded-for"] ? String(req.headers["x-forwarded-for"]).split(",")[0].trim() : req.socket.remoteAddress) || "?";
const reference = () => { const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; let s = ""; for (const b of crypto.randomBytes(6)) s += A[b % A.length]; return "KPP-" + s; };
const safeEq = (a, b) => { const x = crypto.createHash("sha256").update(a).digest(), y = crypto.createHash("sha256").update(b).digest(); return crypto.timingSafeEqual(x, y); };

function headers(extra) {
  return Object.assign({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  }, extra);
}
const send = (res, code, body, h) => { res.writeHead(code, headers(h)); res.end(body); };
const json = (res, code, obj) => send(res, code, JSON.stringify(obj), { "Content-Type": "application/json", "Cache-Control": "no-store" });

function readBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error("too large"), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// five requests per ten minutes per address, held in memory
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  if (list.length >= 5) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < win)) hits.delete(k);
  return false;
}

function validate(raw) {
  const b = {
    name: clean(raw.name, 80), phone: clean(raw.phone, 24), email: clean(raw.email, 120),
    problem: clean(raw.problem, 60), when: clean(raw.when, 40) || WHEN[0], details: clean(raw.details, 1500), page: clean(raw.page, 120),
  };
  const fields = [];
  if (b.name.length < 2) fields.push("name");
  const digits = b.phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15 || /[^\d\s()+.\-x]/i.test(b.phone)) fields.push("phone");
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email)) fields.push("email");
  if (!PROBLEMS.includes(b.problem)) fields.push("problem");
  if (!WHEN.includes(b.when)) fields.push("when");
  return { b, fields };
}

function notify(b) {
  if (!/^https:\/\//.test(NOTIFY_WEBHOOK)) return;
  fetch(NOTIFY_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `New service call ${b.reference}: ${b.name}, ${b.phone}. ${b.problem} (${b.when}).`, booking: b }), signal: AbortSignal.timeout(8000) })
    .catch((e) => console.error("notify failed:", e.message));
}

// ------------------------------------------------------------- bookings --
async function createBooking(req, res) {
  const type = String(req.headers["content-type"] || "");
  const wantsJson = type.includes("application/json") || String(req.headers.accept || "").includes("application/json");
  const fail = (code, error, fields) => (wantsJson ? json(res, code, { ok: false, error, fields: fields || [] }) : send(res, code, error, { "Content-Type": "text/plain; charset=utf-8" }));
  let raw;
  try {
    const text = await readBody(req);
    raw = type.includes("application/json") ? JSON.parse(text || "{}") : Object.fromEntries(new URLSearchParams(text));
  } catch (e) { return fail(e.code === 413 ? 413 : 400, "That request could not be read."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(400, "That request could not be read.");
  // the honeypot: people never see this field, scripts fill it in
  if (clean(raw.website, 200)) return wantsJson ? json(res, 200, { ok: true, reference: "KPP-000000", name: "", phone: "", problem: "" }) : send(res, 303, "", { Location: "/thanks.html" });
  if (limited(clientIp(req))) return fail(429, "Too many requests from this connection. Please call (226) 240-4250.");
  const { b, fields } = validate(raw);
  if (fields.length) return fail(422, fields.includes("phone") ? "Please check the phone number, including the area code." : "Please check the highlighted fields.", fields);
  b.reference = reference(); b.created_at = new Date().toISOString();
  try { store.add(b); } catch (e) { console.error("store failed:", e); return fail(500, "The request could not be saved. Please call (226) 240-4250."); }
  console.log(`booking ${b.reference} ${b.problem} (${b.when})`);
  notify(b);
  if (wantsJson) return json(res, 201, { ok: true, reference: b.reference, name: b.name.split(/\s+/)[0], phone: b.phone, problem: b.problem });
  send(res, 303, "", { Location: "/thanks.html?ref=" + b.reference });
}

// ----------------------------------------------------------------- admin --
function authed(req) {
  if (!ADMIN_PASSWORD) return false;
  const m = String(req.headers.authorization || "").match(/^Basic (.+)$/);
  if (!m) return false;
  const [u, ...p] = Buffer.from(m[1], "base64").toString("utf8").split(":");
  return safeEq(u, ADMIN_USER) && safeEq(p.join(":"), ADMIN_PASSWORD);
}
const sameOrigin = (req) => { const o = req.headers.origin; if (!o) return true; try { return new URL(o).host === req.headers.host; } catch { return false; } };

function adminPage(rows) {
  const fmt = (iso) => new Date(iso).toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" });
  const open = rows.filter((r) => r.status === "new").length;
  return `<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Service calls · Office</title>
<link rel="stylesheet" href="/scrollcraft.css"><link rel="stylesheet" href="/site.css">
<style>
  main { padding: 2.5rem var(--sc-gutter) 5rem; max-width: 96rem; margin: 0 auto; }
  header.o { display: flex; flex-wrap: wrap; gap: 1rem 2rem; align-items: end; justify-content: space-between; margin-bottom: 2.5rem; }
  header.o img { width: 190px; height: auto; margin-bottom: 1.5rem; }
  h1 { font-size: var(--sc-t-3xl); } .muted { color: var(--sc-ink-soft); margin: .6rem 0 0; }
  .rows { display: grid; gap: .9rem; }
  .row { background: var(--kp-raised); border-radius: var(--sc-r-lg); padding: 1.25rem 1.4rem; box-shadow: var(--sc-edge), var(--sc-e1); display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 4fr) minmax(0, 4fr); gap: 1rem 2rem; align-items: start; }
  .row[data-s="new"] { box-shadow: inset 3px 0 0 var(--kp-red), var(--sc-edge), var(--sc-e1); }
  .row h2 { font-family: var(--sc-font-display); font-weight: 500; font-size: var(--sc-t-lg); margin: 0; line-height: 1.2; }
  .row p { margin: .3rem 0 0; color: var(--sc-ink-soft); font-size: var(--sc-t-sm); line-height: 1.5; overflow-wrap: anywhere; }
  .row p b { color: var(--sc-ink); font-weight: 500; } .ref { font-variant-numeric: tabular-nums; letter-spacing: .04em; }
  .row form { display: grid; grid-template-columns: 9rem minmax(0, 1fr) auto; gap: .5rem; align-items: center; }
  .row :is(select, input) { background: #070E26; border: 1px solid rgb(238 242 251 / .24); border-radius: 10px; padding: .6rem .7rem; font-size: .95rem; min-width: 0; }
  .row button { padding: .7em 1.1em; font-size: .95rem; } .row button::after { display: none; }
  .empty { padding: 4rem 0; color: var(--sc-ink-soft); font-size: var(--sc-t-lg); }
  @media (max-width: 900px) { .row, .row form { grid-template-columns: minmax(0, 1fr); } }
</style></head><body><main>
<header class="o"><div><img src="/assets/logo-dark.png" width="732" height="138" alt="Kitchener Plumbing Pros"><h1 class="sc-display kp-h">Service <strong>calls.</strong></h1>
<p class="muted">${rows.length} request${rows.length === 1 ? "" : "s"}, ${open} not yet called. Stored in ${store.kind === "sqlite" ? "SQLite" : "a JSON file"}.</p></div>
<a class="kp-btn kp-btn--ghost" href="/admin/export.csv">Download CSV</a></header>
${rows.length ? `<div class="rows">${rows.map((r) => `<article class="row" data-s="${esc(r.status)}">
  <div><h2>${esc(r.name)}</h2><p><b><a href="tel:${esc(r.phone.replace(/[^\d+]/g, ""))}">${esc(r.phone)}</a></b>${r.email ? `<br><a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ""}</p><p class="ref">${esc(r.reference)} · ${esc(fmt(r.created_at))}</p></div>
  <div><h2>${esc(r.problem)}</h2><p><b>${esc(r.when)}</b></p>${r.details ? `<p>${esc(r.details)}</p>` : ""}</div>
  <form method="post" action="/admin/update"><input type="hidden" name="reference" value="${esc(r.reference)}">
    <select name="status" aria-label="Status for ${esc(r.reference)}">${STATUSES.map((s) => `<option${s === r.status ? " selected" : ""}>${s}</option>`).join("")}</select>
    <input name="note" value="${esc(r.note || "")}" maxlength="300" placeholder="Office note" aria-label="Note for ${esc(r.reference)}"><button class="kp-btn" type="submit">Save</button></form>
</article>`).join("")}</div>` : `<p class="empty">No requests yet. They appear here the moment someone books.</p>`}
</main></body></html>`;
}

async function admin(req, res, url) {
  if (!ADMIN_PASSWORD) return send(res, 503, "The office inbox is switched off. Set ADMIN_PASSWORD in .env and restart the server.", { "Content-Type": "text/plain; charset=utf-8" });
  if (!authed(req)) return send(res, 401, "Sign in required.", { "WWW-Authenticate": 'Basic realm="KPP office", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" });
  if (req.method === "GET" && url.pathname === "/admin") return send(res, 200, adminPage(store.all()), { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  if (req.method === "GET" && url.pathname === "/admin/export.csv") {
    const cols = ["reference", "created_at", "status", "name", "phone", "email", "problem", "when", "details", "note", "page"];
    // a leading =, +, - or @ would be run as a formula by a spreadsheet
    const cell = (v) => { let s = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const csv = [cols.join(",")].concat(store.all().map((r) => cols.map((c) => cell(r[c])).join(","))).join("\r\n");
    return send(res, 200, "﻿" + csv, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="service-calls.csv"', "Cache-Control": "no-store" });
  }
  if (req.method === "POST" && url.pathname === "/admin/update") {
    if (!sameOrigin(req)) return send(res, 403, "Cross-site request refused.", { "Content-Type": "text/plain; charset=utf-8" });
    const f = Object.fromEntries(new URLSearchParams(await readBody(req)));
    if (!/^KPP-[A-Z0-9]{6}$/.test(f.reference || "") || !STATUSES.includes(f.status)) return send(res, 422, "Invalid update.", { "Content-Type": "text/plain; charset=utf-8" });
    store.update(f.reference, f.status, clean(f.note, 300));
    return send(res, 303, "", { Location: "/admin" });
  }
  send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
}

// ---------------------------------------------------------------- static --
function serveStatic(req, res, url) {
  let p;
  try { p = decodeURIComponent(url.pathname); } catch { return send(res, 400, "Bad request"); }
  if (p.endsWith("/")) p += "index.html";
  if (!path.extname(p)) p += ".html";
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, "Forbidden");
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      const nf = path.join(PUBLIC, "404.html");
      return fs.readFile(nf, (e, buf) => send(res, 404, e ? "Not found" : buf, { "Content-Type": e ? "text/plain" : MIME[".html"] }));
    }
    const ext = path.extname(file).toLowerCase();
    const etag = `W/"${st.size}-${Math.floor(st.mtimeMs)}"`;
    const h = { "Content-Type": MIME[ext] || "application/octet-stream", "ETag": etag, "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600" };
    if (req.headers["if-none-match"] === etag) return send(res, 304, "", h);
    res.writeHead(200, headers(Object.assign(h, { "Content-Length": st.size })));
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

// ---------------------------------------------------------------- server --
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const done = (p) => Promise.resolve(p).catch((e) => { console.error(e); if (!res.headersSent) send(res, 500, "Server error"); });
  if (url.pathname === "/api/health") return json(res, 200, { ok: true, storage: store.kind, admin: Boolean(ADMIN_PASSWORD) });
  if (url.pathname === "/api/bookings") return req.method === "POST" ? done(createBooking(req, res)) : json(res, 405, { ok: false, error: "POST only" });
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return done(admin(req, res, url));
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
  serveStatic(req, res, url);
});
server.listen(PORT, HOST, () => {
  console.log(`Kitchener Plumbing Pros concept site: http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(`storage: ${store.kind}   office inbox: ${ADMIN_PASSWORD ? "/admin (user " + ADMIN_USER + ")" : "off, set ADMIN_PASSWORD to enable"}`);
});
