import 'dotenv/config';
import crypto from 'node:crypto';

const env = process.env;
const nodeEnv = env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

let jwtSecret = env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  if (isProd) {
    throw new Error('JWT_SECRET es obligatorio en producción (mínimo 32 caracteres).');
  }
  jwtSecret = crypto.randomBytes(48).toString('hex');
  if (nodeEnv !== 'test') {
    console.warn('[config] JWT_SECRET no definido o muy corto: se generó uno temporal (las sesiones se perderán al reiniciar).');
  }
}

export const config = Object.freeze({
  nodeEnv,
  isProd,
  isTest: nodeEnv === 'test',
  port: Number(env.PORT) || 3000,
  databaseUrl: env.DATABASE_URL || '',
  dbSsl: env.DATABASE_SSL === 'true',
  pgliteDir: env.PGLITE_DIR || './data/pgdata',
  jwtSecret,
  jwtExpiresIn: env.JWT_EXPIRES_IN || '8h',
  cookieName: 'fitbook_token',
  cookieMaxAgeMs: 8 * 60 * 60 * 1000,
  cookieSameSite: ['strict', 'lax', 'none'].includes(env.COOKIE_SAMESITE) ? env.COOKIE_SAMESITE : 'strict',
  corsOrigin: env.CORS_ORIGIN || '',
  seedOnStart: env.SEED_ON_START !== 'false',
  bcryptRounds: Number(env.BCRYPT_ROUNDS) || 12
});
