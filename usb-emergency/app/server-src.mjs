import express from "express";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const DB_PATH = join(DATA_DIR, "emergency.db");
const SEED_DIR = join(DATA_DIR, "seed");
const EXPORT_DIR = join(ROOT, "export");
const RECEIPTS_DIR = join(ROOT, "receipts");

// Ensure directories exist
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(EXPORT_DIR, { recursive: true });
mkdirSync(RECEIPTS_DIR, { recursive: true });

// Initialize SQLite database
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

// Schema (simplified for emergency billing)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    max_discount REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uhid TEXT UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    age INTEGER,
    gender TEXT
  );

  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT
  );

  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES patients(id),
    doctor_id INTEGER REFERENCES doctors(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS order_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id),
    test_id INTEGER REFERENCES tests(id),
    price REAL NOT NULL,
    discount REAL DEFAULT 0,
    final_price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_no TEXT UNIQUE NOT NULL,
    order_id INTEGER REFERENCES orders(id),
    total REAL NOT NULL,
    discount REAL DEFAULT 0,
    net REAL NOT NULL,
    paid REAL DEFAULT 0,
    due REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    voided INTEGER DEFAULT 0,
    void_reason TEXT,
    emergency_uuid TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER REFERENCES bills(id),
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS emergency_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    started_by TEXT NOT NULL,
    active INTEGER DEFAULT 1
  );
`);

const app = express();
app.use(express.json());
app.use(express.static(join(ROOT, "public")));

// Auth middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No auth" });

  const [scheme, token] = auth.split(" ");
  if (scheme !== "Bearer") return res.status(401).json({ error: "Invalid auth" });

  try {
    const session = JSON.parse(Buffer.from(token, "base64").toString());
    if (!session.userId || !session.exp || session.exp < Date.now()) {
      return res.status(401).json({ error: "Session expired" });
    }
    req.user = session;
    next();
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
}

// Login
app.post("/api/login", (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin) return res.status(400).json({ error: "Username and PIN required" });

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = bcrypt.compareSync(pin, user.pin_hash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const session = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };

  const token = Buffer.from(JSON.stringify(session)).toString("base64");
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

// Get current session
app.get("/api/session", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Patients
app.get("/api/patients", requireAuth, (req, res) => {
  const search = req.query.search || "";
  const patients = db.prepare(`
    SELECT * FROM patients
    WHERE name LIKE ? OR phone LIKE ? OR uhid LIKE ?
    ORDER BY name
    LIMIT 50
  `).all(`%${search}%`, `%${search}%`, `%${search}%`);
  res.json(patients);
});

app.post("/api/patients", requireAuth, (req, res) => {
  const { name, phone, age, gender } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });

  const uhid = `P-${String(Date.now()).slice(-6)}`;
  const result = db.prepare(`
    INSERT INTO patients (uhid, name, phone, age, gender)
    VALUES (?, ?, ?, ?, ?)
  `).run(uhid, name, phone || null, age || null, gender || null);

  res.json({ id: result.lastInsertRowid, uhid, name });
});

// Doctors
app.get("/api/doctors", requireAuth, (req, res) => {
  const doctors = db.prepare("SELECT * FROM doctors ORDER BY name").all();
  res.json(doctors);
});

// Tests
app.get("/api/tests", requireAuth, (req, res) => {
  const search = req.query.search || "";
  const tests = db.prepare(`
    SELECT * FROM tests
    WHERE name LIKE ? OR code LIKE ?
    ORDER BY name
    LIMIT 100
  `).all(`%${search}%`, `%${search}%`);
  res.json(tests);
});

// Orders
app.post("/api/orders", requireAuth, (req, res) => {
  const { patientId, doctorId, testIds } = req.body;
  if (!patientId || !testIds?.length) {
    return res.status(400).json({ error: "Patient and tests required" });
  }

  const orderNo = `ORD-${Date.now()}`;
  const order = db.prepare(`
    INSERT INTO orders (order_no, patient_id, doctor_id)
    VALUES (?, ?, ?)
  `).run(orderNo, patientId, doctorId || null);

  const orderId = order.lastInsertRowid;

  // Add tests
  const insertTest = db.prepare(`
    INSERT INTO order_tests (order_id, test_id, price, discount, final_price)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const testId of testIds) {
    const test = db.prepare("SELECT * FROM tests WHERE id = ?").get(testId);
    if (test) {
      insertTest.run(orderId, testId, test.price, 0, test.price);
    }
  }

  res.json({ id: orderId, orderNo });
});

// Bills
app.post("/api/bills", requireAuth, (req, res) => {
  const { orderId, discount = 0, amountReceived = 0, paymentMethod = "cash" } = req.body;
  if (!orderId) return res.status(400).json({ error: "Order ID required" });

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const orderTests = db.prepare(`
    SELECT SUM(final_price) as total
    FROM order_tests
    WHERE order_id = ?
  `).get(orderId);

  const total = orderTests.total || 0;
  const net = total - discount;
  const due = net - amountReceived;
  const status = due <= 0 ? "paid" : amountReceived > 0 ? "partial" : "pending";

  const billNo = `EMG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Date.now()).slice(-5)}`;
  const emergencyUuid = `emg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const bill = db.prepare(`
    INSERT INTO bills (bill_no, order_id, total, discount, net, paid, due, status, emergency_uuid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(billNo, orderId, total, discount, net, amountReceived, due, status, emergencyUuid);

  const billId = bill.lastInsertRowid;

  // Record payment
  if (amountReceived > 0) {
    db.prepare(`
      INSERT INTO payments (bill_id, amount, method)
      VALUES (?, ?, ?)
    `).run(billId, amountReceived, paymentMethod);
  }

  res.json({
    id: billId,
    billNo,
    total,
    discount,
    net,
    paid: amountReceived,
    due,
    status,
    emergencyUuid,
  });
});

// Get bill by ID
app.get("/api/bills/:id", requireAuth, (req, res) => {
  const bill = db.prepare("SELECT * FROM bills WHERE id = ?").get(req.params.id);
  if (!bill) return res.status(404).json({ error: "Bill not found" });

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(bill.order_id);
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(order.patient_id);
  const orderTests = db.prepare(`
    SELECT ot.*, t.name, t.code
    FROM order_tests ot
    JOIN tests t ON ot.test_id = t.id
    WHERE ot.order_id = ?
  `).all(bill.order_id);

  res.json({ bill, order, patient, tests: orderTests });
});

// Void bill
app.post("/api/bills/:id/void", requireAuth, (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: "Void reason required" });

  db.prepare(`
    UPDATE bills
    SET voided = 1, void_reason = ?, status = 'voided'
    WHERE id = ?
  `).run(reason, req.params.id);

  res.json({ success: true });
});

// Export CSV for CARE reconciliation
app.get("/api/export/csv", requireAuth, (req, res) => {
  const bills = db.prepare(`
    SELECT b.*, o.order_no, p.name as patient_name, p.phone, p.uhid
    FROM bills b
    JOIN orders o ON b.order_id = o.id
    JOIN patients p ON o.patient_id = p.id
    WHERE b.voided = 0
    ORDER BY b.created_at
  `).all();

  const csv = [
    "emergency_transaction_uuid,bill_no,order_no,patient_uhid,patient_name,patient_phone,total,discount,net,paid,due,status,created_at",
    ...bills.map(b => [
      b.emergency_uuid,
      b.bill_no,
      b.order_no,
      b.uhid,
      b.patient_name,
      b.phone || "",
      b.total,
      b.discount,
      b.net,
      b.paid,
      b.due,
      b.status,
      b.created_at,
    ].join(",")),
  ].join("\n");

  const filename = `CARE_EMERGENCY_BILLING_${Date.now()}.csv`;
  const filepath = join(EXPORT_DIR, filename);
  writeFileSync(filepath, csv);

  res.json({ filename, filepath, count: bills.length });
});

// Emergency sessions
app.get("/api/sessions", requireAuth, (req, res) => {
  const sessions = db.prepare("SELECT * FROM emergency_sessions ORDER BY started_at DESC").all();
  res.json(sessions);
});

app.post("/api/sessions", requireAuth, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  const result = db.prepare(`
    INSERT INTO emergency_sessions (started_at, started_by)
    VALUES (?, ?)
  `).run(new Date().toISOString(), req.user.name);

  res.json({ id: result.lastInsertRowid, startedAt: new Date().toISOString() });
});

app.post("/api/sessions/:id/end", requireAuth, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  db.prepare(`
    UPDATE emergency_sessions
    SET ended_at = ?, active = 0
    WHERE id = ?
  `).run(new Date().toISOString(), req.params.id);

  res.json({ success: true });
});

// Load seed data
function loadSeedData() {
  const masterPath = join(SEED_DIR, "CARE_EMERGENCY_MASTER_V1.json");
  if (!existsSync(masterPath)) {
    console.log("No seed data found. Create default admin user.");
    const pinHash = bcrypt.hashSync("1234", 10);
    db.prepare("INSERT OR IGNORE INTO users (username, pin_hash, name, role) VALUES (?, ?, ?, ?)")
      .run("owner", pinHash, "Owner", "super_admin");
    return;
  }

  const master = JSON.parse(readFileSync(masterPath, "utf-8"));

  // Load users
  if (master.staff) {
    const insertUser = db.prepare("INSERT OR IGNORE INTO users (username, pin_hash, name, role) VALUES (?, ?, ?, ?)");
    for (const user of master.staff) {
      const pinHash = bcrypt.hashSync(user.pin || "1234", 10);
      insertUser.run(user.username, pinHash, user.name, user.role || "staff");
    }
  }

  // Load patients
  if (master.patients) {
    const insertPatient = db.prepare("INSERT OR IGNORE INTO patients (uhid, name, phone, age, gender) VALUES (?, ?, ?, ?, ?)");
    for (const patient of master.patients) {
      insertPatient.run(patient.uhid, patient.name, patient.phone, patient.age, patient.gender);
    }
  }

  // Load doctors
  if (master.doctors) {
    const insertDoctor = db.prepare("INSERT OR IGNORE INTO doctors (name, specialty) VALUES (?, ?)");
    for (const doctor of master.doctors) {
      insertDoctor.run(doctor.name, doctor.specialty);
    }
  }

  // Load tests
  if (master.services) {
    const insertTest = db.prepare("INSERT OR IGNORE INTO tests (code, name, price, category) VALUES (?, ?, ?, ?)");
    for (const test of master.services) {
      insertTest.run(test.code, test.name, test.price, test.category);
    }
  }

  console.log(`Loaded seed data: ${master.staff?.length || 0} users, ${master.patients?.length || 0} patients, ${master.doctors?.length || 0} doctors, ${master.services?.length || 0} tests`);
}

// Initialize and start
loadSeedData();

const PORT = process.env.PORT || 8898;
const HOST = process.env.HOST || "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`\nCARE Ultra-Emergency Billing (USB)`);
  console.log(`Use ONLY if CARE and DS225+ are both down.`);
  console.log(`\nServer running at http://${HOST}:${PORT}/`);
  console.log(`Database: ${DB_PATH}`);
  console.log(`\nPress Ctrl+C to stop.\n`);
});
