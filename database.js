const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'ticket_system.db')
  : path.join(__dirname, 'ticket_system.db');
let SQL = null;
let db = null;

async function initDb() {
  SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'menunggu_verifikasi',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, organizer_id INTEGER NOT NULL,
    title TEXT NOT NULL, description TEXT, date DATETIME NOT NULL,
    location TEXT NOT NULL, ticket_price REAL DEFAULT 0, ticket_quota INTEGER DEFAULT 0,
    poster_url TEXT, status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL, quantity INTEGER DEFAULT 1, total_price REAL DEFAULT 0,
    status TEXT DEFAULT 'draft_pesanan',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (event_id) REFERENCES events(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL,
    amount REAL DEFAULT 0, method TEXT DEFAULT 'transfer',
    status TEXT DEFAULT 'menunggu_pembayaran', gateway_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
    qr_code TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'aktif',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  save();
  return db;
}

function save() {
  if (db) {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  }
}

function prepare(sql) {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return {
    run(...params) {
      db.run(sql, params);
      save();
      const result = db.exec("SELECT last_insert_rowid() as id");
      return { lastInsertRowid: result.length > 0 ? result[0].values[0][0] : 0 };
    },
    get(...params) {
      try {
        const stmt = db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        let result = null;
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          result = {};
          cols.forEach((c, i) => { result[c] = vals[i]; });
        }
        stmt.free();
        return result;
      } catch (e) { console.error('DB get error:', e); return null; }
    },
    all(...params) {
      try {
        const stmt = db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        const cols = stmt.getColumnNames();
        const results = [];
        while (stmt.step()) {
          const vals = stmt.get();
          const row = {};
          cols.forEach((c, i) => { row[c] = vals[i]; });
          results.push(row);
        }
        stmt.free();
        return results;
      } catch (e) { console.error('DB all error:', e); return []; }
    }
  };
}

module.exports = { initDb, prepare, save };
