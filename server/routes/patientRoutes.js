const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { encryptField, decryptField } = require('../db/encryption');
const { authenticateToken, requireRole, enforceFullUsbPrivilege } = require('../middleware/auth');
const { addAuditLog } = require('../middleware/auditLogger');
const { queueEmail } = require('../services/emailService');

// 1. Get All Patients (Restricted to Doctor and Admin only!)
// If patient user requests raw list -> 403 Forbidden!
router.get('/', authenticateToken, requireRole(['doctor', 'admin']), (req, res) => {
  db.all('SELECT * FROM patients ORDER BY id DESC', [], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Log access of patient records
    await addAuditLog(db, {
      userId: req.user.id,
      action: 'PATIENT_DATA_ACCESSED',
      details: `Accessed list of ${rows.length} patient records`,
      ipAddress: req.ip
    });

    // Decrypt AES-256 fields for authorized doctor/admin
    const decryptedRows = rows.map(r => ({
      ...r,
      name: decryptField(r.name_encrypted),
      phone: decryptField(r.phone_encrypted),
      email: r.email_encrypted ? decryptField(r.email_encrypted) : '',
      address: decryptField(r.address_encrypted)
    }));

    res.json(decryptedRows);
  });
});

// 2. Add New Patient Record (with Duplicate Detection & Field Encryption)
router.post('/', authenticateToken, requireRole(['doctor', 'admin']), (req, res) => {
  const { name, phone, email, address, age, gender, disease, city, lat, lng, status = 'under_treatment' } = req.body;

  if (!name || !disease || !city) {
    return res.status(400).json({ error: 'Name, disease, and city are required.' });
  }

  // Duplicate Patient Detection logic
  db.all('SELECT id, name_encrypted, city, age FROM patients WHERE city = ? AND age = ?', [city, age], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const isDuplicate = rows.some(r => {
      const decryptedName = decryptField(r.name_encrypted);
      return decryptedName.toLowerCase() === name.trim().toLowerCase();
    });

    if (isDuplicate) {
      return res.status(409).json({ 
        error: 'Duplicate patient detected! A patient with the same name, age, and city already exists.',
        code: 'DUPLICATE_PATIENT'
      });
    }

    // Encrypt Sensitive PII Fields
    const nameEnc = encryptField(name);
    const phoneEnc = encryptField(phone || '');
    const emailEnc = email ? encryptField(email) : null;
    const addressEnc = encryptField(address || '');

    db.run(
      `INSERT INTO patients (doctor_id, name_encrypted, phone_encrypted, email_encrypted, address_encrypted, age, gender, disease, city, lat, lng, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, nameEnc, phoneEnc, emailEnc, addressEnc, age || 30, gender || 'other', disease, city, lat || 28.6139, lng || 77.2090, status],
      async function (insertErr) {
        if (insertErr) return res.status(500).json({ error: insertErr.message });

        const patientId = this.lastID;
        await addAuditLog(db, {
          userId: req.user.id,
          action: 'PATIENT_CREATED',
          details: `Created record ID ${patientId} for disease ${disease} in ${city}`,
          ipAddress: req.ip
        });

        res.status(201).json({ message: 'Patient record created successfully.', patientId });
      }
    );
  });
});

// 3. Edit Patient Record (Saves history snapshot)
router.put('/:id', authenticateToken, requireRole(['doctor', 'admin']), (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address, age, gender, disease, city, status } = req.body;

  db.get('SELECT * FROM patients WHERE id = ?', [id], (err, oldRecord) => {
    if (err || !oldRecord) return res.status(404).json({ error: 'Patient record not found.' });

    // Archive old values into history
    const oldSnapshot = JSON.stringify({
      name: decryptField(oldRecord.name_encrypted),
      phone: decryptField(oldRecord.phone_encrypted),
      email: oldRecord.email_encrypted ? decryptField(oldRecord.email_encrypted) : '',
      address: decryptField(oldRecord.address_encrypted),
      age: oldRecord.age,
      gender: oldRecord.gender,
      disease: oldRecord.disease,
      city: oldRecord.city,
      status: oldRecord.status
    });

    db.run(
      `INSERT INTO patient_history (patient_id, modified_by_user_id, action, old_values) VALUES (?, ?, 'EDIT', ?)`,
      [id, req.user.id, oldSnapshot]
    );

    const nameEnc = encryptField(name || decryptField(oldRecord.name_encrypted));
    const phoneEnc = encryptField(phone || decryptField(oldRecord.phone_encrypted));
    const emailEnc = email ? encryptField(email) : oldRecord.email_encrypted;
    const addressEnc = encryptField(address || decryptField(oldRecord.address_encrypted));

    db.run(
      `UPDATE patients SET 
        name_encrypted = ?, phone_encrypted = ?, email_encrypted = ?, address_encrypted = ?,
        age = ?, gender = ?, disease = ?, city = ?, status = ?
       WHERE id = ?`,
      [
        nameEnc, phoneEnc, emailEnc, addressEnc,
        age || oldRecord.age,
        gender || oldRecord.gender,
        disease || oldRecord.disease,
        city || oldRecord.city,
        status || oldRecord.status,
        id
      ],
      async (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        await addAuditLog(db, {
          userId: req.user.id,
          action: 'PATIENT_UPDATED',
          details: `Updated patient ID ${id}`,
          ipAddress: req.ip
        });

        res.json({ message: 'Patient record updated successfully.' });
      }
    );
  });
});

// 4. Delete Patient Record (Allowed for Doctor and Admin)
router.delete('/:id', authenticateToken, requireRole(['doctor', 'admin']), (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM patients WHERE id = ?', [id], (err, oldRecord) => {
    if (err || !oldRecord) return res.status(404).json({ error: 'Patient record not found.' });

    const oldSnapshot = JSON.stringify({
      name: decryptField(oldRecord.name_encrypted),
      disease: oldRecord.disease,
      city: oldRecord.city
    });

    db.run(`INSERT INTO patient_history (patient_id, modified_by_user_id, action, old_values) VALUES (?, ?, 'DELETE', ?)`, [id, req.user.id, oldSnapshot]);
    db.run('DELETE FROM patients WHERE id = ?', [id], async (delErr) => {
      if (delErr) return res.status(500).json({ error: delErr.message });

      await addAuditLog(db, {
        userId: req.user.id,
        action: 'PATIENT_DELETED',
        details: `Deleted patient ID ${id}`,
        ipAddress: req.ip
      });

      res.json({ message: 'Patient record deleted permanently.' });
    });
  });
});

// 5. Patient Follow-up Reminders List
router.get('/follow-ups', authenticateToken, requireRole(['doctor', 'admin']), (req, res) => {
  db.all("SELECT * FROM patients WHERE status = 'under_treatment' OR status = 'referred' ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const safeRows = rows.map(r => ({
      ...r,
      name: decryptField(r.name_encrypted),
      phone: decryptField(r.phone_encrypted),
      email: r.email_encrypted ? decryptField(r.email_encrypted) : ''
    }));

    res.json(safeRows);
  });
});

// 6. Trigger Patient Reminder (Dispatches WhatsApp Web link & Email notification)
router.post('/:id/reminder', authenticateToken, requireRole(['doctor', 'admin']), (req, res) => {
  const { id } = req.params;
  const { customEmail, customPhone } = req.body || {};

  db.get('SELECT * FROM patients WHERE id = ?', [id], async (err, patient) => {
    if (err || !patient) return res.status(404).json({ error: 'Patient record not found.' });

    const patientName = decryptField(patient.name_encrypted);
    const rawPhone = customPhone || decryptField(patient.phone_encrypted);
    const rawEmail = customEmail || (patient.email_encrypted ? decryptField(patient.email_encrypted) : null);
    const disease = patient.disease;

    // Clean phone number for WhatsApp Web API (Default to 8369791943 if missing)
    let targetPhone = rawPhone || '8369791943';
    let cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone; // India country code default if 10 digits
    }

    const reminderMessage = `Hello ${patientName},\n\nThis is an automated health follow-up reminder from your attending doctor regarding your diagnosis of ${disease}.\n\nPlease ensure you follow your prescribed medication routine, drink clean water, and schedule a follow-up visit if your symptoms persist.\n\nTake care & stay healthy!\n- HealthSec Medical Team`;

    // Direct WhatsApp Web link (Connects with logged-in WhatsApp Web account in browser)
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(reminderMessage)}`;

    let emailSent = false;
    if (rawEmail) {
      queueEmail({
        to: rawEmail,
        subject: `🏥 Health Follow-up Reminder: ${disease} Care Plan`,
        body: reminderMessage
      });
      emailSent = true;
    }

    await addAuditLog(db, {
      userId: req.user.id,
      action: 'PATIENT_REMINDER_SENT',
      details: `Dispatched follow-up reminder to ${patientName} (${disease}) via WhatsApp/Email`,
      ipAddress: req.ip
    });

    res.json({
      message: 'Reminder processed successfully!',
      patientName,
      disease,
      phone: rawPhone,
      email: rawEmail,
      whatsappUrl,
      reminderMessage,
      emailSent
    });
  });
});

module.exports = router;
