const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { encryptField } = require('./encryption');

const dbPath = path.join(__dirname, '..', '..', 'data.db');
const db = new sqlite3.Database(dbPath);

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT CHECK(role IN ('admin', 'doctor', 'patient')) NOT NULL DEFAULT 'patient',
          status TEXT CHECK(status IN ('active', 'suspended', 'banned', 'pending_approval')) NOT NULL DEFAULT 'active',
          medical_license TEXT,
          license_document TEXT,
          totp_secret TEXT,
          totp_enabled INTEGER DEFAULT 0,
          failed_login_attempts INTEGER DEFAULT 0,
          lockout_until TEXT,
          registered_usbs TEXT DEFAULT '[]',
          otp_fallback_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          refresh_token TEXT NOT NULL,
          device TEXT NOT NULL,
          ip_address TEXT NOT NULL,
          last_active DATETIME NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // 3. Password Resets
      db.run(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          used INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // 4. Patients table
      db.run(`
        CREATE TABLE IF NOT EXISTS patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          doctor_id INTEGER,
          name_encrypted TEXT NOT NULL,
          phone_encrypted TEXT NOT NULL,
          email_encrypted TEXT,
          address_encrypted TEXT NOT NULL,
          age INTEGER NOT NULL,
          gender TEXT NOT NULL,
          disease TEXT NOT NULL,
          city TEXT NOT NULL,
          lat REAL,
          lng REAL,
          status TEXT CHECK(status IN ('under_treatment', 'recovered', 'referred')) DEFAULT 'under_treatment',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (doctor_id) REFERENCES users(id)
        )
      `);
      db.run("ALTER TABLE patients ADD COLUMN email_encrypted TEXT", () => {});

      // 5. Patient History (Audit on Edit/Delete)
      db.run(`
        CREATE TABLE IF NOT EXISTS patient_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER NOT NULL,
          modified_by_user_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          old_values TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 6. Audit Logs (Tamper-proof Hash Chain)
      db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          details TEXT NOT NULL,
          ip_address TEXT NOT NULL,
          previous_hash TEXT NOT NULL,
          hash TEXT NOT NULL,
          timestamp DATETIME NOT NULL
        )
      `);

      // 7. AI Chats
      db.run(`
        CREATE TABLE IF NOT EXISTS ai_chats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          query TEXT NOT NULL,
          response TEXT NOT NULL,
          feedback INTEGER DEFAULT NULL,
          feedback_comment TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 7b. Admin Uploads (CSV & PDF files)
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_uploads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uploaded_by_user_id INTEGER NOT NULL,
          original_name TEXT NOT NULL,
          filename TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
        )
      `);

      // 8. Disease Alerts (Deduplication)
      db.run(`
        CREATE TABLE IF NOT EXISTS disease_alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          disease TEXT NOT NULL,
          city TEXT NOT NULL,
          cases_count INTEGER NOT NULL,
          alert_sent_at DATETIME NOT NULL
        )
      `);

      // 9. USB Requests
      db.run(`
        CREATE TABLE IF NOT EXISTS usb_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          public_key TEXT NOT NULL,
          device_name TEXT NOT NULL,
          status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // 10. Admin OTP Verifications
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_otps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          otp TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          used INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 11. User Preferences
      db.run(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id INTEGER PRIMARY KEY,
          alerts_enabled INTEGER DEFAULT 1,
          email_notifications INTEGER DEFAULT 1,
          language TEXT DEFAULT 'en',
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, async () => {
        // Seed default users if empty
        await seedDefaultData();
        resolve(db);
      });
    });
  });
}

async function seedDefaultData() {
  const adminEmail = 'ajay.gupta.ethical@gmail.com';
  const hashedAdminPassword = await bcrypt.hash('ajaya2006', 10);
  const hashedDoctorPassword = await bcrypt.hash('Doctor@Security10#', 10);
  const hashedPatientPassword = await bcrypt.hash('Patient@Security10#', 10);

  // Check if Master Admin exists
  db.get("SELECT id FROM users WHERE email = ?", [adminEmail], async (err, row) => {
    if (!row) {
      db.run(
        `INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)`,
        ['Master Admin (Ajay Gupta)', adminEmail, hashedAdminPassword, 'admin', 'active']
      );
    }
  });

  // Check if Doctor exists
  db.get("SELECT id FROM users WHERE role = 'doctor'", [], async (err, row) => {
    if (!row) {
      db.run(
        `INSERT INTO users (name, email, password, role, status, medical_license) VALUES (?, ?, ?, ?, ?, ?)`,
        ['Dr. Aakash Sharma', 'doctor@healthsec.gov.in', hashedDoctorPassword, 'doctor', 'active', 'MCI-987654']
      );
    }
  });

  // Check if Patient user exists
  db.get("SELECT id FROM users WHERE role = 'patient'", [], async (err, row) => {
    if (!row) {
      db.run(
        `INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)`,
        ['Rahul Kumar', 'patient@healthsec.gov.in', hashedPatientPassword, 'patient', 'active']
      );
    }
  });

  // Seed sample patient records for Analytics & Map if database has no patients
  db.get('SELECT COUNT(*) as count FROM patients', [], (err, row) => {
    if (row && row.count === 0) {
      const samplePatients = [
        { name: 'Rohan Sharma', phone: '+91 9876543210', address: 'Connaught Place, Delhi', age: 34, gender: 'male', disease: 'Dengue', city: 'Delhi', lat: 28.6139, lng: 77.2090, status: 'under_treatment' },
        { name: 'Priya Singh', phone: '+91 9876543211', address: 'Bandra, Mumbai', age: 28, gender: 'female', disease: 'Dengue', city: 'Delhi', lat: 28.6250, lng: 77.2100, status: 'under_treatment' },
        { name: 'Amit Verma', phone: '+91 9876543212', address: 'Rohini, Delhi', age: 45, gender: 'male', disease: 'Dengue', city: 'Delhi', lat: 28.7041, lng: 77.1025, status: 'under_treatment' },
        { name: 'Sunita Patel', phone: '+91 9876543213', address: 'Dwarka, Delhi', age: 52, gender: 'female', disease: 'Dengue', city: 'Delhi', lat: 28.5921, lng: 77.0460, status: 'recovered' },
        { name: 'Vikram Joshi', phone: '+91 9876543214', address: 'Karol Bagh, Delhi', age: 22, gender: 'male', disease: 'Dengue', city: 'Delhi', lat: 28.6517, lng: 77.1906, status: 'under_treatment' },
        { name: 'Ananya Gupta', phone: '+91 9876543215', address: 'Andheri, Mumbai', age: 31, gender: 'female', disease: 'Malaria', city: 'Mumbai', lat: 19.1197, lng: 72.8464, status: 'under_treatment' },
        { name: 'Suresh Raina', phone: '+91 9876543216', address: 'Juhu, Mumbai', age: 40, gender: 'male', disease: 'Malaria', city: 'Mumbai', lat: 19.1075, lng: 72.8263, status: 'recovered' },
        { name: 'Meena Roy', phone: '+91 9876543217', address: 'Salt Lake, Kolkata', age: 60, gender: 'female', disease: 'Chikungunya', city: 'Kolkata', lat: 22.5726, lng: 88.3639, status: 'under_treatment' },
        { name: 'Rajesh Nair', phone: '+91 9876543218', address: 'Indiranagar, Bangalore', age: 29, gender: 'male', disease: 'Dengue', city: 'Bangalore', lat: 12.9716, lng: 77.5946, status: 'under_treatment' },
        { name: 'Kavita Das', phone: '+91 9876543219', address: 'Banjara Hills, Hyderabad', age: 38, gender: 'female', disease: 'Typhoid', city: 'Hyderabad', lat: 17.3850, lng: 78.4867, status: 'under_treatment' },
      ];

      samplePatients.forEach(p => {
        db.run(
          `INSERT INTO patients (doctor_id, name_encrypted, phone_encrypted, address_encrypted, age, gender, disease, city, lat, lng, status)
           VALUES (2, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            encryptField(p.name),
            encryptField(p.phone),
            encryptField(p.address),
            p.age,
            p.gender,
            p.disease,
            p.city,
            p.lat,
            p.lng,
            p.status
          ]
        );
      });
    }
  });
}

module.exports = {
  db,
  initDatabase
};
