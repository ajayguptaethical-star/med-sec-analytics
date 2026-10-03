const crypto = require('crypto');

function computeHash(id, timestamp, userId, action, details, previousHash) {
  const payload = `${id}|${timestamp}|${userId || 'SYSTEM'}|${action}|${details}|${previousHash}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function addAuditLog(db, { userId, action, details, ipAddress = '127.0.0.1' }) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, hash FROM audit_logs ORDER BY id DESC LIMIT 1', [], (err, lastRow) => {
      if (err) return reject(err);

      const previousHash = lastRow ? lastRow.hash : 'GENESIS_HASH_00000000000000000000000000000000000000000000000000000000';
      const timestamp = new Date().toISOString();
      
      db.run(
        `INSERT INTO audit_logs (user_id, action, details, ip_address, previous_hash, hash, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId || null, action, details || '', ipAddress, previousHash, 'TEMP', timestamp],
        function (insertErr) {
          if (insertErr) return reject(insertErr);
          const newId = this.lastID;
          const finalHash = computeHash(newId, timestamp, userId, action, details, previousHash);

          db.run('UPDATE audit_logs SET hash = ? WHERE id = ?', [finalHash, newId], (updateErr) => {
            if (updateErr) return reject(updateErr);
            resolve({ id: newId, hash: finalHash, previousHash });
          });
        }
      );
    });
  });
}

function verifyAuditChain(db) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM audit_logs ORDER BY id ASC', [], (err, rows) => {
      if (err) return reject(err);
      if (!rows || rows.length === 0) {
        return resolve({ isValid: true, count: 0, brokenAtId: null });
      }

      let expectedPreviousHash = 'GENESIS_HASH_00000000000000000000000000000000000000000000000000000000';
      for (const row of rows) {
        if (row.previous_hash !== expectedPreviousHash) {
          return resolve({ isValid: false, count: rows.length, brokenAtId: row.id, reason: 'Previous hash mismatch' });
        }
        
        const recalculatedHash = computeHash(
          row.id,
          row.timestamp,
          row.user_id,
          row.action,
          row.details,
          row.previous_hash
        );

        if (row.hash !== recalculatedHash) {
          return resolve({ isValid: false, count: rows.length, brokenAtId: row.id, reason: 'Hash tamper detected' });
        }

        expectedPreviousHash = row.hash;
      }

      return resolve({ isValid: true, count: rows.length, brokenAtId: null });
    });
  });
}

module.exports = {
  addAuditLog,
  verifyAuditChain,
  computeHash
};
