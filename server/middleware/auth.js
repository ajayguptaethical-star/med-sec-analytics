const jwt = require('jsonwebtoken');
const { db } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_9876543210_health_app';
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes idle timeout

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ')) 
    ? authHeader.split(' ')[1] 
    : req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Token expired or invalid', code: 'TOKEN_EXPIRED' });
    }

    const sessionId = user.sessionId;
    if (!sessionId) {
      req.user = user;
      return next();
    }

    // Check database session status
    db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (dbErr, session) => {
      if (dbErr || !session || session.is_active === 0) {
        return res.status(401).json({ 
          error: 'Session terminated. Single active session policy enforced (logged in elsewhere).',
          code: 'SESSION_TERMINATED'
        });
      }

      // Check Idle Timeout (10 minutes of inactivity for Admin / Doctor)
      const lastActive = new Date(session.last_active).getTime();
      const now = Date.now();

      if ((user.role === 'admin' || user.role === 'doctor') && (now - lastActive > IDLE_TIMEOUT_MS)) {
        // Invalidate session
        db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', [sessionId]);
        return res.status(401).json({ 
          error: 'Session expired due to 10 minutes of inactivity. Please login again.',
          code: 'IDLE_TIMEOUT' 
        });
      }

      // Update last_active timestamp
      db.run('UPDATE sessions SET last_active = ? WHERE id = ?', [new Date().toISOString(), sessionId]);

      req.user = {
        ...user,
        sessionId: session.id,
        otpFallbackActive: user.otpFallbackActive || false
      };

      next();
    });
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient permissions.' });
    }
    next();
  };
}

// Blocks sensitive actions (delete, export, config changes) if logged in via OTP fallback without USB Key
function enforceFullUsbPrivilege(req, res, next) {
  if (req.user && req.user.otpFallbackActive) {
    return res.status(403).json({ 
      error: 'Action blocked: Session has limited privilege (OTP Fallback mode). USB Key challenge required.',
      code: 'USB_REQUIRED'
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireRole,
  enforceFullUsbPrivilege,
  JWT_SECRET
};
