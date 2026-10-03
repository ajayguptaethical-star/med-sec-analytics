const crypto = require('crypto');
const { db } = require('../db/database');

const activeChallenges = new Map(); // sessionId/userId -> { nonce, expiresAt }

function generateChallenge(userId) {
  const nonce = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins expiry
  activeChallenges.set(userId, { nonce, expiresAt });
  return nonce;
}

function verifyChallenge(userId, signatureHex, publicKeyPem) {
  const challengeObj = activeChallenges.get(userId);
  if (!challengeObj) {
    return { valid: false, error: 'Challenge expired or not requested.' };
  }

  if (Date.now() > challengeObj.expiresAt) {
    activeChallenges.delete(userId);
    return { valid: false, error: 'Challenge expired.' };
  }

  const nonce = challengeObj.nonce;

  try {
    // If HMAC/Key fingerprint or RSA signature
    if (publicKeyPem.startsWith('-----BEGIN PUBLIC KEY-----')) {
      const verifier = crypto.createVerify('SHA256');
      verifier.update(nonce);
      verifier.end();
      const isValid = verifier.verify(publicKeyPem, Buffer.from(signatureHex, 'hex'));
      if (isValid) {
        activeChallenges.delete(userId);
        return { valid: true };
      }
    } else {
      // Secret key HMAC verification fallback for software USB simulation key files
      const expectedSignature = crypto.createHmac('sha256', publicKeyPem).update(nonce).digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(signatureHex), Buffer.from(expectedSignature))) {
        activeChallenges.delete(userId);
        return { valid: true };
      }
    }
    return { valid: false, error: 'Invalid USB Key signature.' };
  } catch (err) {
    return { valid: false, error: 'Signature verification error: ' + err.message };
  }
}

function getUserUsbKeys(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT registered_usbs FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) return reject(err);
      if (!row || !row.registered_usbs) return resolve([]);
      try {
        const keys = JSON.parse(row.registered_usbs);
        resolve(keys);
      } catch (e) {
        resolve([]);
      }
    });
  });
}

function revokeUsbKey(userId, keyFingerprint) {
  return new Promise(async (resolve, reject) => {
    try {
      const keys = await getUserUsbKeys(userId);
      const updatedKeys = keys.filter(k => k.fingerprint !== keyFingerprint && k.publicKey !== keyFingerprint);
      
      db.run('UPDATE users SET registered_usbs = ? WHERE id = ?', [JSON.stringify(updatedKeys), userId], (err) => {
        if (err) return reject(err);
        resolve({ success: true, count: updatedKeys.length });
      });
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  generateChallenge,
  verifyChallenge,
  getUserUsbKeys,
  revokeUsbKey
};
