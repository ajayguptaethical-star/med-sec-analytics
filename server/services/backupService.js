const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const backupsDir = path.join(__dirname, '..', '..', 'backups');
const dbPath = path.join(__dirname, '..', '..', 'data.db');

function createEncryptedBackup() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    if (!fs.existsSync(dbPath)) {
      return resolve({ success: false, reason: 'Database file not found' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.db.enc`;
    const destinationPath = path.join(backupsDir, backupFileName);

    const hexKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const key = Buffer.from(hexKey, 'hex');
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const input = fs.createReadStream(dbPath);
    const output = fs.createWriteStream(destinationPath);

    output.write(iv); // Prepends IV

    input.on('data', chunk => {
      output.write(cipher.update(chunk));
    });

    input.on('end', () => {
      cipher.final();
      const tag = cipher.getAuthTag();
      output.write(tag); // Appends auth tag
      output.end();
      console.log(`[BACKUP SUCCESS] Encrypted database backup saved to ${backupFileName}`);
      resolve({ success: true, backupFile: backupFileName, path: destinationPath });
    });

    input.on('error', err => {
      reject(err);
    });
  });
}

module.exports = {
  createEncryptedBackup
};
