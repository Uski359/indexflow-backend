import rateLimit from 'express-rate-limit';

export const faucetLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

export const validatorRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Validator operations are being rate limited.'
});
