const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const { db } = require('../db/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { loginRateLimiter, otpRateLimiter } = require('../middleware/rateLimiter');
const { addAuditLog } = require('../middleware/auditLogger');
const { sendLockoutNotification, sendNewDeviceLoginAlert, sendEmail } = require('../services/emailService');

const COMMON_PASSWORDS = ['password123', '1234567890', 'admin12345', 'qwerty1234', 'password10#'];

function validatePasswordPolicy(password) {
  if (!password || password.length < 10) {
    return { valid: false, error: 'Password must be at least 10 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special symbol.' };
  }
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return { valid: false, error: 'Common/weak passwords are not allowed.' };
  }
  return { valid: true };
}

// 1. Register User (Admin account registration via API blocked!)
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'patient', consentGiven, medicalLicense } = req.body;

  if (!consentGiven) {
    return res.status(400).json({ error: 'You must agree to the Privacy Policy & Data Use terms.' });
  }

  if (role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts cannot be registered via public API.' });
  }

  const passCheck = validatePasswordPolicy(password);
  if (!passCheck.valid) {
    return res.status(400).json({ error: passCheck.error });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userStatus = role === 'doctor' ? 'pending_approval' : 'active';

    db.run(
      `INSERT INTO users (name, email, password, role, status, medical_license) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role, userStatus, medicalLicense || null],
      async function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email address is already registered.' });
          }
          return res.status(500).json({ error: err.message });
        }

        const newUserId = this.lastID;
        await addAuditLog(db, {
          userId: newUserId,
          action: 'USER_REGISTERED',
          details: `Registered account: ${email}, role: ${role}`,
          ipAddress: req.ip
        });

        res.status(201).json({
          message: role === 'doctor' 
            ? 'Registration submitted! Doctor account pending Admin approval.' 
            : 'Registration successful! You can now log in.',
          userId: newUserId
        });
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Login User
router.post('/login', loginRateLimiter, (req, res) => {
  const { email, password, totpCode, isOtpFallback } = req.body;
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req.ip || '127.0.0.1';

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check account status
    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ error: `Account is ${user.status}. Contact Admin.` });
    }
    if (user.status === 'pending_approval') {
      return res.status(403).json({ error: 'Doctor account pending Admin verification approval.' });
    }

    // Check account lockout (5 failed attempts -> 15 min lock)
    if (user.lockout_until) {
      const lockTime = new Date(user.lockout_until).getTime();
      if (Date.now() < lockTime) {
        const remainingMins = Math.ceil((lockTime - Date.now()) / (60 * 1000));
        return res.status(429).json({ 
          error: `Account locked due to multiple failed login attempts. Try again in ${remainingMins} minutes.` 
        });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const newFailed = user.failed_login_attempts + 1;
      let lockoutUntil = null;

      if (newFailed >= 5) {
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        sendLockoutNotification(user.email);
        await addAuditLog(db, {
          userId: user.id,
          action: 'ACCOUNT_LOCKED',
          details: `Account locked after 5 failed attempts from IP ${ipAddress}`,
          ipAddress
        });
      }

      db.run('UPDATE users SET failed_login_attempts = ?, lockout_until = ? WHERE id = ?', [
        newFailed >= 5 ? 0 : newFailed,
        lockoutUntil,
        user.id
      ]);

      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check TOTP 2FA if enabled
    if (user.totp_enabled === 1 && !totpCode && !isOtpFallback) {
      return res.status(200).json({ 
        require2FA: true, 
        message: 'Google Authenticator 2FA TOTP code required.' 
      });
    }

    if (user.totp_enabled === 1 && totpCode) {
      const verified = speakeasy.totp.verify({
        secret: user.totp_secret,
        encoding: 'base32',
        token: totpCode
      });
      if (!verified) {
        return res.status(401).json({ error: 'Invalid 2FA TOTP code.' });
      }
    }

    // Single Active Session Policy for Admin & Doctor: Kill prior active sessions!
    if (user.role === 'admin' || user.role === 'doctor') {
      db.run('UPDATE sessions SET is_active = 0 WHERE user_id = ?', [user.id]);
    }

    // Check New Device / IP Alert
    db.get(
      'SELECT id FROM sessions WHERE user_id = ? AND (device = ? OR ip_address = ?)',
      [user.id, userAgent, ipAddress],
      (sErr, existingSession) => {
        if (!existingSession) {
          sendNewDeviceLoginAlert(user.email, userAgent, ipAddress);
        }
      }
    );

    // Create New Session
    const sessionId = crypto.randomUUID();
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const nowIso = new Date().toISOString();

    db.run(
      `INSERT INTO sessions (id, user_id, refresh_token, device, ip_address, last_active, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [sessionId, user.id, refreshToken, userAgent, ipAddress, nowIso]
    );

    // Reset failed login attempts
    db.run('UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, otp_fallback_active = ? WHERE id = ?', [
      isOtpFallback ? 1 : 0,
      user.id
    ]);

    // Issue JWT Access Token (24 hours expiry for uninterrupted clinical work)
    const accessToken = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sessionId,
        otpFallbackActive: !!isOtpFallback
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set HTTP-Only Refresh & Access Cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false, // Set to true in prod with HTTPS
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await addAuditLog(db, {
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      details: `Logged in via ${isOtpFallback ? 'OTP Fallback' : 'Standard Auth'} on ${userAgent}`,
      ipAddress
    });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sessionId,
        totpEnabled: !!user.totp_enabled,
        registeredUsbs: JSON.parse(user.registered_usbs || '[]'),
        otpFallbackActive: !!isOtpFallback
      }
    });
  });
});

// 2b. Refresh Access Token Endpoint
router.post('/refresh', (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required.' });
  }

  db.get(
    'SELECT s.*, u.name, u.email, u.role, u.totp_enabled, u.registered_usbs, u.otp_fallback_active FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.refresh_token = ? AND s.is_active = 1',
    [refreshToken],
    (err, session) => {
      if (err || !session) {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      }

      const newAccessToken = jwt.sign(
        {
          id: session.user_id,
          name: session.name,
          email: session.email,
          role: session.role,
          sessionId: session.id,
          otpFallbackActive: !!session.otp_fallback_active
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });

      res.json({
        accessToken: newAccessToken,
        user: {
          id: session.user_id,
          name: session.name,
          email: session.email,
          role: session.role,
          sessionId: session.id,
          totpEnabled: !!session.totp_enabled,
          registeredUsbs: JSON.parse(session.registered_usbs || '[]'),
          otpFallbackActive: !!session.otp_fallback_active
        }
      });
    }
  );
});

// 3. Forgot Password Flow (15 min single-use link)
router.post('/forgot-password', otpRateLimiter, (req, res) => {
  const { email } = req.body;
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) {
      // Don't reveal account existence for privacy
      return res.json({ message: 'If an account exists with this email, a reset link has been dispatched.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    db.run(
      `INSERT INTO password_resets (id, user_id, token, expires_at, used) VALUES (?, ?, ?, ?, 0)`,
      [crypto.randomUUID(), user.id, resetToken, expiresAt],
      (insertErr) => {
        if (insertErr) return res.status(500).json({ error: insertErr.message });

        const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
        sendEmail({
          to: email,
          subject: '🔒 Password Reset Link (15 Min Expiry)',
          body: `Please use the following single-use link to reset your password:\n${resetLink}\n\nThis link will expire in 15 minutes.`
        });

        res.json({ message: 'If an account exists with this email, a reset link has been dispatched.' });
      }
    );
  });
});

// 4. Reset Password
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  const passCheck = validatePasswordPolicy(newPassword);
  if (!passCheck.valid) {
    return res.status(400).json({ error: passCheck.error });
  }

  db.get(
    'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > ?',
    [token, new Date().toISOString()],
    async (err, resetRecord) => {
      if (err || !resetRecord) {
        return res.status(400).json({ error: 'Invalid, used, or expired reset token.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetRecord.user_id]);
      db.run('UPDATE password_resets SET used = 1 WHERE id = ?', [resetRecord.id]);

      await addAuditLog(db, {
        userId: resetRecord.user_id,
        action: 'PASSWORD_RESET',
        details: 'Password successfully reset via token',
        ipAddress: req.ip
      });

      res.json({ message: 'Password reset successful! You can now log in with your new password.' });
    }
  );
});

// 5. Get Active Sessions for Current User
router.get('/sessions', authenticateToken, (req, res) => {
  db.all(
    'SELECT id, device, ip_address, last_active, is_active, created_at FROM sessions WHERE user_id = ? AND is_active = 1',
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// 6. Terminate / Remote Logout Session
router.delete('/sessions/:sessionId', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  db.run('UPDATE sessions SET is_active = 0 WHERE id = ? AND user_id = ?', [sessionId, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    addAuditLog(db, {
      userId: req.user.id,
      action: 'REMOTE_LOGOUT',
      details: `Revoked session ${sessionId}`,
      ipAddress: req.ip
    });

    res.json({ message: 'Session terminated successfully.' });
  });
});

// 7. Setup TOTP 2FA
router.post('/totp/setup', authenticateToken, (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `SecureHealthApp (${req.user.email})`
  });

  db.run('UPDATE users SET totp_secret = ? WHERE id = ?', [secret.base32, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    qrcode.toDataURL(secret.otpauth_url, (qrErr, dataUrl) => {
      if (qrErr) return res.status(500).json({ error: qrErr.message });
      res.json({
        secret: secret.base32,
        qrCodeUrl: dataUrl
      });
    });
  });
});

// 8. Verify TOTP 2FA
router.post('/totp/verify', authenticateToken, (req, res) => {
  const { token } = req.body;
  db.get('SELECT totp_secret FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user || !user.totp_secret) {
      return res.status(400).json({ error: '2FA setup not initiated.' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token
    });

    if (verified) {
      db.run('UPDATE users SET totp_enabled = 1 WHERE id = ?', [req.user.id]);
      return res.json({ message: '2FA Google Authenticator enabled successfully!' });
    }

    res.status(400).json({ error: 'Invalid code. Please try again.' });
  });
});

// 10. USB Pendrive Passkey Detection & Auto-Login System (Admin & Doctor Support)
const fs = require('fs');
const path = require('path');

const GLOBAL_ADMIN_PASSKEY = 'ADMIN_PASSKEY_HW_KEY_SECURE_HEALTH_2026_AJAY_GUPTA';
const GLOBAL_DOCTOR_PASSKEY = 'DOCTOR_PASSKEY_HW_KEY_SECURE_HEALTH_2026_DR_AAKASH';

// Provision Passkey files to connected USB drives for Admin or Doctor
function provisionPasskeyToConnectedDrives(role = 'admin') {
  const drivesWritten = [];
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const keyFileName = role === 'doctor' ? 'doctor_key.sec' : 'admin_key.sec';
  const passkeyContent = role === 'doctor' ? GLOBAL_DOCTOR_PASSKEY : GLOBAL_ADMIN_PASSKEY;

  // Save to local uploads folder
  fs.writeFileSync(path.join(uploadsDir, keyFileName), passkeyContent, 'utf8');

  // Scan drive letters D: to Z: and write passkeys to connected USB drive
  for (let i = 68; i <= 90; i++) {
    const drive = String.fromCharCode(i) + ':\\';
    try {
      if (fs.existsSync(drive)) {
        fs.writeFileSync(path.join(drive, keyFileName), passkeyContent, 'utf8');
        if (role === 'doctor') {
          fs.writeFileSync(path.join(drive, 'doctor_passkey.key'), passkeyContent, 'utf8');
          fs.writeFileSync(path.join(drive, 'DOCTOR_PASSKEY_AUTOLOGIN.key'), passkeyContent, 'utf8');
        } else {
          fs.writeFileSync(path.join(drive, 'admin_passkey.key'), passkeyContent, 'utf8');
          fs.writeFileSync(path.join(drive, 'ADMIN_PASSKEY_AUTOLOGIN.key'), passkeyContent, 'utf8');
        }
        drivesWritten.push(drive);
      }
    } catch (e) {
      // Ignore inaccessible volumes
    }
  }
  return drivesWritten;
}

function detectUsbPendriveKey() {
  const drivesToScan = [];
  for (let i = 68; i <= 90; i++) {
    drivesToScan.push(String.fromCharCode(i) + ':\\');
  }

  // 1. Check for Doctor USB Passkeys on REAL external drives D:\ to Z:\ ONLY
  // NOTE: Local uploads/ folder is NOT checked — it caused auto-login after logout!
  for (const drive of drivesToScan) {
    try {
      if (fs.existsSync(drive)) {
        const docFile1 = path.join(drive, 'doctor_key.sec');
        const docFile2 = path.join(drive, 'doctor_passkey.key');
        const docFile3 = path.join(drive, 'DOCTOR_PASSKEY_AUTOLOGIN.key');

        if (fs.existsSync(docFile1) || fs.existsSync(docFile2) || fs.existsSync(docFile3)) {
          return { found: true, role: 'doctor', drive };
        }
      }
    } catch (e) {}
  }

  // 2. Check for Admin USB Passkeys on REAL external drives D:\ to Z:\ ONLY
  for (const drive of drivesToScan) {
    try {
      if (fs.existsSync(drive)) {
        const admFile1 = path.join(drive, 'admin_key.sec');
        const admFile2 = path.join(drive, 'admin_passkey.key');
        const admFile3 = path.join(drive, 'ADMIN_PASSKEY_AUTOLOGIN.key');
        const admFile4 = path.join(drive, '.admin_key');

        if (fs.existsSync(admFile1) || fs.existsSync(admFile2) || fs.existsSync(admFile3) || fs.existsSync(admFile4)) {
          return { found: true, role: 'admin', drive };
        }
      }
    } catch (e) {}
  }

  // Local uploads/ fallback REMOVED — it caused instant re-login after logout!
  return { found: false };
}

// USB Check Endpoint for automatic login when pendrive is inserted (Supports both Admin & Doctor)
router.get('/usb-check', (req, res) => {
  const usbStatus = detectUsbPendriveKey();
  if (!usbStatus.found) {
    return res.json({ detected: false, message: 'No registered USB Pendrive detected.' });
  }

  const targetRole = usbStatus.role || 'admin';
  const sql = targetRole === 'doctor'
    ? "SELECT * FROM users WHERE role = 'doctor' AND status = 'active' ORDER BY id ASC LIMIT 1"
    : "SELECT * FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id ASC LIMIT 1";

  db.get(sql, [], async (err, user) => {
    if (err || !user) {
      return res.status(404).json({ detected: false, error: `No active ${targetRole} account found.` });
    }

    const userAgent = req.headers['user-agent'] || `${targetRole.toUpperCase()} USB Hardware Passkey Auto-Detect`;
    const ipAddress = req.ip || '127.0.0.1';

    // Single Active Session: kill prior sessions
    db.run('UPDATE sessions SET is_active = 0 WHERE user_id = ?', [user.id]);

    const sessionId = crypto.randomUUID();
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const nowIso = new Date().toISOString();

    db.run(
      `INSERT INTO sessions (id, user_id, refresh_token, device, ip_address, last_active, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [sessionId, user.id, refreshToken, userAgent, ipAddress, nowIso]
    );

    // Reset failed login attempts
    db.run('UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = ?', [user.id]);

    const accessToken = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sessionId
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await addAuditLog(db, {
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      details: `Logged in automatically via ${targetRole.toUpperCase()} USB Pendrive Passkey on drive ${usbStatus.drive}`,
      ipAddress
    });

    return res.json({
      detected: true,
      role: targetRole,
      message: `🔌 ${targetRole.toUpperCase()} USB Pendrive Key Detected on ${usbStatus.drive}! Automatic Login Successful.`,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sessionId
      }
    });
  });
});

// Setup / Provision USB Passkey Key endpoint (Supports role: 'admin' or 'doctor')
router.post('/setup-usb-key', (req, res) => {
  const role = req.body?.role || 'admin';
  const drivesWritten = provisionPasskeyToConnectedDrives(role);

  res.json({
    message: `${role.toUpperCase()} USB Pendrive Passkey provisioned successfully! Key saved to ${drivesWritten.length > 0 ? drivesWritten.join(', ') : 'Virtual USB Token'}.`,
    role,
    drivesWritten
  });
});

// 11. Send OTP for Admin Password / OTP Login
router.post('/send-otp', otpRateLimiter, (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Please enter your email address.' });
  }

  db.get('SELECT id, name, email, role FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'No account found registered with this email address.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    db.run(
      `INSERT INTO admin_otps (email, otp, expires_at, used) VALUES (?, ?, ?, 0)`,
      [email, otp, expiresAt],
      (insertErr) => {
        if (insertErr) return res.status(500).json({ error: insertErr.message });

        sendEmail({
          to: email,
          subject: '🔑 Admin Login OTP Verification Code',
          body: `Hello ${user.name},\n\nYour One-Time Password (OTP) for Admin login is: ${otp}\n\nThis code will expire in 10 minutes.\nIf you did not request this OTP, please secure your account.`
        });

        res.json({
          message: `OTP has been dispatched to ${email}! Check your email (or use debug OTP below).`,
          otpSent: true,
          debugOtp: otp
        });
      }
    );
  });
});

// 12. Verify OTP & Auto-Login
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and 6-digit OTP code are required.' });
  }

  const nowIso = new Date().toISOString();

  db.get(
    'SELECT * FROM admin_otps WHERE email = ? AND otp = ? AND used = 0 AND expires_at > ? ORDER BY id DESC LIMIT 1',
    [email, otp, nowIso],
    (err, otpRecord) => {
      if (err || !otpRecord) {
        return res.status(400).json({ error: 'Invalid or expired OTP code. Machine check failed. Please try again.' });
      }

      // Mark OTP as used
      db.run('UPDATE admin_otps SET used = 1 WHERE id = ?', [otpRecord.id]);

      // Fetch user and perform automatic login
      db.get('SELECT * FROM users WHERE email = ?', [email], async (uErr, user) => {
        if (uErr || !user) {
          return res.status(404).json({ error: 'Associated user account not found.' });
        }

        const userAgent = req.headers['user-agent'] || 'Unknown Device';
        const ipAddress = req.ip || '127.0.0.1';

        // Kill prior active sessions for Admin/Doctor
        if (user.role === 'admin' || user.role === 'doctor') {
          db.run('UPDATE sessions SET is_active = 0 WHERE user_id = ?', [user.id]);
        }

        const sessionId = crypto.randomUUID();
        const refreshToken = crypto.randomBytes(40).toString('hex');

        db.run(
          `INSERT INTO sessions (id, user_id, refresh_token, device, ip_address, last_active, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [sessionId, user.id, refreshToken, userAgent, ipAddress, nowIso]
        );

        // Reset failed login attempts
        db.run('UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = ?', [user.id]);

        const accessToken = jwt.sign(
          {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            sessionId,
            otpVerified: true
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        });

        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });

        await addAuditLog(db, {
          userId: user.id,
          action: 'LOGIN_SUCCESS',
          details: `Logged in via Email OTP Verification (${email})`,
          ipAddress
        });

        res.json({
          message: 'OTP check successful! Welcome back, Admin.',
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            sessionId
          }
        });
      });
    }
  );
});

module.exports = router;
