const requestStore = new Map();

function createLimiter({ windowMs, maxRequests, message }) {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const key = `${req.ip}_${req.baseUrl}${req.path}`;
    const now = Date.now();

    if (!requestStore.has(key)) {
      requestStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = requestStore.get(key);
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({ error: message || 'Too many requests. Please try again later.' });
    }

    record.count += 1;
    next();
  };
}

const loginRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many login attempts. Please wait 15 minutes.'
});

const otpRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many OTP requests. Please wait 15 minutes.'
});

const aiRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'AI query rate limit exceeded. Please wait a minute.'
});

module.exports = {
  loginRateLimiter,
  otpRateLimiter,
  aiRateLimiter
};
