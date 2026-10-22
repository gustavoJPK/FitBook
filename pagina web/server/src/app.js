import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { csrfGuard } from './middleware/auth.js';
import { errorHandler, notFoundApi } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../../client');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProd) app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        styleSrcAttr: ["'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: config.isProd ? [] : null
      }
    }
  }));
  app.use(compression());

  // CORS: en desarrollo permite Live Server u orígenes locales; en prod usa config.corsOrigin
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    const isAllowed = config.corsOrigin
      ? origin === config.corsOrigin
      : (!config.isProd && origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));

    if (isAllowed) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        Vary: 'Origin'
      });
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());

  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', csrfGuard, apiRouter);
  app.use('/api', notFoundApi);

  // Frontend estático (SPA)
  app.use(express.static(PUBLIC_DIR, { maxAge: config.isProd ? '7d' : 0, index: 'index.html' }));
  app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

  app.use(errorHandler);
  return app;
}
