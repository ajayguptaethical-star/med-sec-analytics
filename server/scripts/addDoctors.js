/**
 * Script: Add 10 Pre-Approved Doctor Accounts
 * Run: node server/scripts/addDoctors.js
 */

const bcrypt = require('bcryptjs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const database = new sqlite3.Database(path.join(__dirname, '..', '..', 'data.db'));

// ─── 10 Doctor Accounts ────────────────────────────────────────────────
const doctors = [
  { name: 'Dr. Aakash Sharma',  email: 'dr.aakash@healthsec.gov.in',  password: 'Doctor@Security10#', license: 'MCI-DL-2024-001' },
  { name: 'Dr. Priya Mehta',    email: 'dr.priya@healthsec.gov.in',   password: 'Doctor@Security10#', license: 'MCI-DL-2024-002' },
  { name: 'Dr. Rahul Verma',    email: 'dr.rahul@healthsec.gov.in',   password: 'Doctor@Security10#', license: 'MCI-DL-2024-003' },
  { name: 'Dr. Sneha Patel',    email: 'dr.sneha@healthsec.gov.in',   password: 'Doctor@Security10#', license: 'MCI-DL-2024-004' },
  { name: 'Dr. Arjun Singh',    email: 'dr.arjun@healthsec.gov.in',   password: 'Doctor@Security10#', license: 'MCI-DL-2024-005' },
  { name: 'Dr. Kavita Rao',     email: 'dr.kavita@healthsec.gov.in',  password: 'Doctor@Security10#', license: 'MCI-DL-2024-006' },
  { name: 'Dr. Vikram Nair',    email: 'dr.vikram@healthsec.gov.in',  password: 'Doctor@Security10#', license: 'MCI-DL-2024-007' },
  { name: 'Dr. Ananya Joshi',   email: 'dr.ananya@healthsec.gov.in',  password: 'Doctor@Security10#', license: 'MCI-DL-2024-008' },
  { name: 'Dr. Rohan Gupta',    email: 'dr.rohan@healthsec.gov.in',   password: 'Doctor@Security10#', license: 'MCI-DL-2024-009' },
  { name: 'Dr. Meera Krishnan', email: 'dr.meera@healthsec.gov.in',   password: 'Doctor@Security10#', license: 'MCI-DL-2024-010' },
];

async function addDoctors() {
  console.log('\n🏥 Adding 10 Doctor Accounts to Database...\n');

  for (const doc of doctors) {
    const hashedPassword = await bcrypt.hash(doc.password, 10);

    await new Promise((resolve) => {
      database.run(
        `INSERT OR IGNORE INTO users (name, email, password, role, status, medical_license, registered_usbs, failed_login_attempts)
         VALUES (?, ?, ?, 'doctor', 'active', ?, '[]', 0)`,
        [doc.name, doc.email, hashedPassword, doc.license],
        function (err) {
          if (err) {
            console.error(`❌ Error adding ${doc.email}:`, err.message);
          } else if (this.changes > 0) {
            console.log(`✅ Added: ${doc.name}  |  ${doc.email}`);
          } else {
            console.log(`⚠️  Already exists: ${doc.email}`);
          }
          resolve();
        }
      );
    });
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('✅ Done! All 10 doctors added with status: ACTIVE');
  console.log('📧 Emails:    dr.NAME@healthsec.gov.in');
  console.log('🔑 Password:  Doctor@Security10#');
  console.log('─────────────────────────────────────────────────────────\n');

  database.close();
}

addDoctors().catch(console.error);
