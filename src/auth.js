'use strict';

const crypto = require('node:crypto');
const { q, log } = require('./db');

const SESSION_COOKIE = 'mcs_session';
const SESSION_DAYS = 14;

/* -------------------------------------------------------------- passwords */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [alg, salt, hash] = String(stored).split('$');
    if (alg !== 'scrypt') return false;
    const test = crypto.scryptSync(password, salt, 64);
    const ref = Buffer.from(hash, 'hex');
    return test.length === ref.length && crypto.timingSafeEqual(test, ref);
  } catch {
    return false;
  }
}

/** Regras mínimas de senha, com mensagem em português. */
function passwordProblem(password) {
  if (!password || password.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return 'Use pelo menos uma letra e um número.';
  return null;
}

/* --------------------------------------------------------------- sessions */

function createSession(userId, req) {
  const id = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  q.run(
    'INSERT INTO sessions (id, user_id, expires_at, ip, ua) VALUES (?, ?, ?, ?, ?)',
    id,
    userId,
    expires.toISOString(),
    req.ip || '',
    String(req.get('user-agent') || '').slice(0, 250),
  );
  q.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", userId);
  q.run("DELETE FROM sessions WHERE expires_at < datetime('now')");
  return { id, expires };
}

function destroySession(id) {
  if (id) q.run('DELETE FROM sessions WHERE id = ?', id);
}

/** Middleware: popula req.user quando houver sessão válida. */
function attachUser(req, res, next) {
  req.user = null;
  const sid = req.cookies?.[SESSION_COOKIE];
  if (sid) {
    const row = q.get(
      `SELECT u.* FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.id = ? AND s.expires_at > datetime('now')`,
      sid,
    );
    if (row) {
      req.user = row;
      req.sessionId = sid;
    }
  }
  res.locals.user = req.user;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    const next_ = encodeURIComponent(req.originalUrl);
    return res.redirect(`/admin/entrar?next=${next_}`);
  }
  next();
}

/* ------------------------------------------------------ brute force guard */

const attempts = new Map(); // ip -> { count, until }

function tooManyAttempts(ip) {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (rec.until > Date.now()) return true;
  attempts.delete(ip);
  return false;
}

function registerFailure(ip) {
  const rec = attempts.get(ip) || { count: 0, until: 0 };
  rec.count += 1;
  if (rec.count >= 5) rec.until = Date.now() + 10 * 60 * 1000;
  attempts.set(ip, rec);
}

function clearFailures(ip) {
  attempts.delete(ip);
}

/* ------------------------------------------------------------------ csrf  */

function csrfToken(req, res) {
  let token = req.cookies?.mcs_csrf;
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    res.cookie('mcs_csrf', token, { httpOnly: false, sameSite: 'lax', path: '/' });
  }
  return token;
}

function checkCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = req.body?._csrf || req.get('x-csrf-token');
  const cookie = req.cookies?.mcs_csrf;
  if (!cookie || sent !== cookie) {
    return res.status(403).send('Sessão expirada ou requisição inválida. Recarregue a página.');
  }
  next();
}

module.exports = {
  SESSION_COOKIE,
  SESSION_DAYS,
  hashPassword,
  verifyPassword,
  passwordProblem,
  createSession,
  destroySession,
  attachUser,
  requireAuth,
  tooManyAttempts,
  registerFailure,
  clearFailures,
  csrfToken,
  checkCsrf,
  log,
};
