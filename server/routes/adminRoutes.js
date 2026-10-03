const path = require('path');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken, requireRole, enforceFullUsbPrivilege } = require('../middleware/auth');
const { verifyAuditChain, addAuditLog } = require('../middleware/auditLogger');
const { revokeUsbKey } = require('../services/usbAuthService');
const { csvUpload, docUpload } = require('../middleware/upload');
const { processCsvBuffer, validateCsvSchema } = require('../middleware/csvSafety');
const { encryptField } = require('../db/encryption');

// All endpoints in adminRoutes require Admin role!
router.use(authenticateToken, requireRole(['admin']));

// 1. Audit Log Viewer with Filters
router.get('/audit-logs', (req, res) => {
  const { user_id, action, ip_address, limit = 100 } = req.query;

  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (user_id) {
    sql += ' AND user_id = ?';
    params.push(user_id);
  }
  if (action) {
    sql += ' AND action LIKE ?';
    params.push(`%${action}%`);
  }
  if (ip_address) {
    sql += ' AND ip_address = ?';
    params.push(ip_address);
  }

  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(Number(limit));

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. Verify Tamper-Proof Audit Hash Chain
router.get('/audit-logs/verify', async (req, res) => {
  try {
    const verification = await verifyAuditChain(db);
    res.json(verification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Security Dashboard Overview & Suspicious Activity Metrics
router.get('/security-dashboard', (req, res) => {
  db.serialize(() => {
    const stats = {};

    db.get('SELECT COUNT(*) as lockedCount FROM users WHERE lockout_until IS NOT NULL', [], (e1, r1) => {
      stats.lockedAccounts = r1 ? r1.lockedCount : 0;

      db.get("SELECT COUNT(*) as failedTotal FROM audit_logs WHERE action = 'ACCOUNT_LOCKED'", [], (e2, r2) => {
        stats.totalLockouts = r2 ? r2.failedTotal : 0;

        db.get('SELECT COUNT(*) as activeSessionsCount FROM sessions WHERE is_active = 1', [], (e3, r3) => {
          stats.activeSessions = r3 ? r3.activeSessionsCount : 0;

          db.all("SELECT * FROM audit_logs WHERE action = 'LOGIN_SUCCESS' ORDER BY id DESC LIMIT 50", [], (e4, rows) => {
            // Suspicious anomaly detector: Logins between 2 AM and 4 AM
            const suspiciousLogins = (rows || []).filter(row => {
              const hour = new Date(row.timestamp).getHours();
              return hour >= 2 && hour <= 4;
            });

            stats.suspiciousLogins = suspiciousLogins;
            stats.recentLogins = rows ? rows.slice(0, 10) : [];

            res.json(stats);
          });
        });
      });
    });
  });
});

// 4. Doctor Verification & User Management (Approve, Suspend, Ban, Reactivate)
router.get('/users', (req, res) => {
  db.all('SELECT id, name, email, role, status, medical_license, registered_usbs, totp_enabled, created_at FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = rows.map(r => ({
      ...r,
      registeredUsbs: JSON.parse(r.registered_usbs || '[]')
    }));
    res.json(formatted);
  });
});

router.put('/users/:id/status', enforceFullUsbPrivilege, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active', 'suspended', 'banned'

  if (!['active', 'suspended', 'banned'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  db.run('UPDATE users SET status = ? WHERE id = ?', [status, id], async function (err) {
    if (err) return res.status(500).json({ error: err.message });

    await addAuditLog(db, {
      userId: req.user.id,
      action: `USER_STATUS_${status.toUpperCase()}`,
      details: `Changed status of User ID ${id} to ${status}`,
      ipAddress: req.ip
    });

    res.json({ message: `User status updated to ${status}` });
  });
});

// 5. Revoke USB Key for a User
router.post('/usb/revoke', enforceFullUsbPrivilege, async (req, res) => {
  const { userId, keyFingerprint } = req.body;
  try {
    await revokeUsbKey(userId, keyFingerprint);
    await addAuditLog(db, {
      userId: req.user.id,
      action: 'USB_REVOKED',
      details: `Revoked USB key ${keyFingerprint} for user ID ${userId}`,
      ipAddress: req.ip
    });
    res.json({ message: 'USB Key revoked successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Kaggle Dataset Import & Dynamic Column Mapping
router.post('/kaggle-import', csvUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded.' });
  }

  const { diseaseCol, cityCol, ageCol, genderCol } = req.body;

  const csvResult = processCsvBuffer(req.file.buffer);
  if (!csvResult.success) {
    return res.status(400).json({ error: csvResult.error });
  }

  const records = csvResult.records;
  if (!records || records.length === 0) {
    return res.status(400).json({ error: 'CSV file contains no rows.' });
  }

  let importedCount = 0;
  db.serialize(() => {
    const stmt = db.prepare(
      `INSERT INTO patients (doctor_id, name_encrypted, phone_encrypted, address_encrypted, age, gender, disease, city, lat, lng, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'under_treatment')`
    );

    records.forEach(row => {
      const disease = row[diseaseCol] || row['disease'] || row['Disease'] || 'Unknown Disease';
      const city = row[cityCol] || row['city'] || row['City'] || 'Delhi';
      const age = parseInt(row[ageCol] || row['age'] || row['Age'] || '30', 10);
      const gender = row[genderCol] || row['gender'] || row['Gender'] || 'other';

      stmt.run([
        req.user.id,
        encryptField('Kaggle Patient'),
        encryptField('+91 0000000000'),
        encryptField(city),
        age,
        gender,
        disease,
        city,
        28.6139,
        77.2090
      ]);
      importedCount++;
    });

    stmt.finalize(async () => {
      await addAuditLog(db, {
        userId: req.user.id,
        action: 'KAGGLE_DATASET_IMPORTED',
        details: `Imported ${importedCount} dataset records from ${req.file.originalname}`,
        ipAddress: req.ip
      });

      res.json({ message: `Successfully imported ${importedCount} records into database!`, count: importedCount });
    });
  });
});

// 7. General Document Upload (CSV and PDF Files)
router.post('/upload-file', docUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please select a CSV or PDF file.' });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const fileType = ext === '.pdf' ? 'PDF' : 'CSV';

  db.run(
    `INSERT INTO admin_uploads (uploaded_by_user_id, original_name, filename, file_type, file_size)
     VALUES (?, ?, ?, ?, ?)`,
    [req.user.id, req.file.originalname, req.file.filename, fileType, req.file.size],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const recordId = this.lastID;
      await addAuditLog(db, {
        userId: req.user.id,
        action: 'ADMIN_FILE_UPLOADED',
        details: `Uploaded ${fileType} document: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`,
        ipAddress: req.ip
      });

      res.status(201).json({
        message: `${fileType} document uploaded successfully!`,
        id: recordId,
        originalName: req.file.originalname,
        filename: req.file.filename,
        fileType,
        fileSize: req.file.size
      });
    }
  );
});

// 8. Get List of Uploaded Documents (CSV and PDF)
router.get('/uploaded-files', (req, res) => {
  db.all(
    `SELECT u.id, u.original_name, u.filename, u.file_type, u.file_size, u.created_at, usr.name as uploader_name
     FROM admin_uploads u
     LEFT JOIN users usr ON u.uploaded_by_user_id = usr.id
     ORDER BY u.id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// 9. Delete Uploaded Document
router.delete('/uploaded-files/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM admin_uploads WHERE id = ?', [id], (err, record) => {
    if (err || !record) return res.status(404).json({ error: 'File record not found.' });

    const filePath = path.join(__dirname, '..', '..', 'uploads', record.filename);

    db.run('DELETE FROM admin_uploads WHERE id = ?', [id], async (delErr) => {
      if (delErr) return res.status(500).json({ error: delErr.message });

      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error('Failed to unlink file:', e); }
      }

      await addAuditLog(db, {
        userId: req.user.id,
        action: 'ADMIN_FILE_DELETED',
        details: `Deleted ${record.file_type} file: ${record.original_name}`,
        ipAddress: req.ip
      });

      res.json({ message: 'File deleted successfully.' });
    });
  });
});

module.exports = router;
