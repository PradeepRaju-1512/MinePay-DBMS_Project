// server.js - express api

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  testPostgresConnection,
  isPostgresConnected,
  sqlTraceBuffer,
  registerUser,
  loginUser,
  demoLogin,
  getEligibleRecipients,
  transferFunds,
  runConcurrencyLab,
  getLectureOverview,
  getTableData,
  getAllAccountsWithUsers,
  getAccountBalance,
  getTransactionHistory,
  getSession,
  deleteSession,
  verifyAccountOwnership,
  pool,
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = process.env.PORT || 3000;

// enable credentials and dynamic origin matching for multi-device cross-origin support
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// helper to extract authenticated user from persistent PostgreSQL session
export async function getAuthenticatedSession(req) {
  let token = null;
  if (req.cookies && req.cookies.minepay_session) {
    token = req.cookies.minepay_session;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.replace('Bearer ', '').trim();
  }
  if (!token) return null;
  return await getSession(token);
}

// middleware to enforce authentication on protected endpoints
export async function requireAuth(req, res, next) {
  try {
    const session = await getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }
    req.user = session.user;
    req.account = session.account;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to verify session: ' + err.message });
  }
}

function setSessionCookie(res, token) {
  res.cookie('minepay_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

// system & database connection status

app.get('/api/status', async (req, res) => {
  const connected = await testPostgresConnection();
  res.json({
    success: true,
    postgresConnected: connected,
    engine: connected ? 'PostgreSQL 14+ Relational Engine' : 'PostgreSQL Engine (Offline / Unreachable)',
    connectionStringConfigured: Boolean(process.env.DATABASE_URL || process.env.SQL_HOST),
    message: connected
      ? 'Live PostgreSQL connection active.'
      : 'PostgreSQL connection offline. Please check database configuration.',
  });
});

// authentication endpoints

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, skinAvatar } = req.body;
  try {
    const result = await registerUser({ username, email, password, skinAvatar });
    res.status(201).json({
      success: true,
      message: 'Player registered successfully. You may now log in.',
      data: {
        userId: result.user.user_id,
        username: result.user.username,
        email: result.user.email,
        accountId: result.account.account_id,
        chestName: result.account.chest_name,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  try {
    const session = await loginUser({ usernameOrEmail, password });
    setSessionCookie(res, session.token);
    res.json({
      success: true,
      token: session.token,
      user: session.user,
      account: session.account,
    });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/demo-login', async (req, res) => {
  const { playerKey, pin, userId, username } = req.body;
  try {
    const session = await demoLogin({ playerKey: playerKey || userId || username, pin, userId, username });
    setSessionCookie(res, session.token);
    res.json({
      success: true,
      token: session.token,
      user: session.user,
      account: session.account,
    });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const session = await getAuthenticatedSession(req);
  if (!session) return res.status(401).json({ success: false, message: 'Unauthenticated' });
  res.json({
    success: true,
    user: session.user,
    account: session.account,
  });
});

app.post('/api/auth/logout', async (req, res) => {
  let token = null;
  if (req.cookies && req.cookies.minepay_session) {
    token = req.cookies.minepay_session;
  } else if (req.headers.authorization) {
    token = req.headers.authorization.replace('Bearer ', '').trim();
  }
  if (token) {
    await deleteSession(token);
  }
  res.clearCookie('minepay_session', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// recipient selection

app.get('/api/recipients', async (req, res) => {
  const session = await getAuthenticatedSession(req);
  const senderAccountId = req.query.senderAccountId || (session && session.account ? session.account.account_id : null);
  const search = req.query.search || '';
  const limit = req.query.limit || 100;
  const offset = req.query.offset || 0;

  try {
    const recipients = await getEligibleRecipients({
      senderAccountId,
      searchQuery: search,
      limit,
      offset,
    });
    res.json({
      success: true,
      count: recipients.length,
      data: recipients,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// users & accounts directory

app.get('/api/users', async (req, res) => {
  try {
    const list = await getAllAccountsWithUsers();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/accounts', async (req, res) => {
  try {
    const list = await getAllAccountsWithUsers();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// live balance & transaction history

app.get('/api/balance', async (req, res) => {
  const session = await getAuthenticatedSession(req);
  const accountId = req.query.accountId || (session && session.account ? session.account.account_id : null);
  if (!accountId) {
    return res.status(400).json({ success: false, message: 'Account ID required' });
  }

  try {
    const data = await getAccountBalance(accountId);
    if (!data) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({
      success: true,
      account: data,
      data: {
        accountId: data.account_id,
        accountNumber: data.account_number,
        chestName: data.chest_name,
        chestType: data.chest_type,
        balance: data.balance,
        user: data.user,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/balance/:accountId', async (req, res) => {
  const { accountId } = req.params;
  try {
    const data = await getAccountBalance(accountId);
    if (!data) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({
      success: true,
      account: data,
      data: {
        accountId: data.account_id,
        accountNumber: data.account_number,
        chestName: data.chest_name,
        chestType: data.chest_type,
        balance: data.balance,
        user: data.user,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

async function handleGetHistory(req, res) {
  const session = await getAuthenticatedSession(req);
  const accountId = req.params.accountId || req.query.accountId || (session && session.account ? session.account.account_id : null);
  const showAll = req.query.all === 'true' || !accountId;

  try {
    const history = await getTransactionHistory({ accountId, showAll, limit: 50 });
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

app.get('/api/history', handleGetHistory);
app.get('/api/history/:accountId', handleGetHistory);
app.get('/api/transactions', handleGetHistory);

// real atomic transfers

app.post('/api/transfer', async (req, res) => {
  const { senderAccountId, receiverAccountId, amount, pin, note, idempotencyKey, source } = req.body;
  const session = await getAuthenticatedSession(req);

  // derive sender from authenticated session if not explicitly provided
  const effectiveSenderAccountId = senderAccountId || (session && session.account ? session.account.account_id : null);
  if (!effectiveSenderAccountId) {
    return res.status(400).json({ success: false, message: 'Sender account ID required' });
  }

  // enforce account ownership: only account owner can transfer out
  if (session) {
    const isOwner = await verifyAccountOwnership(session.user.user_id, effectiveSenderAccountId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only transfer funds out of accounts that you own.',
        status: 'PERMISSION_DENIED',
      });
    }
  }

  const authenticatedUserId = session ? session.user.user_id : null;

  try {
    const result = await transferFunds({
      senderAccountId: effectiveSenderAccountId,
      receiverAccountId,
      amount,
      pin,
      note,
      idempotencyKey,
      source: source || 'BANK',
      authenticatedUserId,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, status: 'ROLLBACK_EXECUTED' });
  }
});

// consistency lab concurrent attack simulator

app.post('/api/lab/attack', async (req, res) => {
  const { targetAccountId, deviceCount, debitAmount } = req.body;
  try {
    const result = await runConcurrencyLab({ targetAccountId, deviceCount, debitAmount });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/lab/concurrency', async (req, res) => {
  const { targetAccountId, deviceCount, debitAmount } = req.body;
  try {
    const result = await runConcurrencyLab({ targetAccountId, deviceCount, debitAmount });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// lecture mode endpoints

app.get('/api/lecture/overview', async (req, res) => {
  try {
    const overview = await getLectureOverview();
    res.json({ success: true, data: overview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const handleGetTraces = (req, res) => {
  const { filter, limit } = req.query;
  let events = [...sqlTraceBuffer];

  if (filter && filter !== 'ALL') {
    events = events.filter(e => e.queryType.toUpperCase() === filter.toUpperCase());
  }

  const max = Math.min(parseInt(limit) || 60, 150);
  res.json({
    success: true,
    count: events.length,
    data: events.slice(0, max),
  });
};

app.get('/api/lecture/trace', handleGetTraces);
app.get('/api/lecture/traces', handleGetTraces);

app.get('/api/lecture/table/:tableName', async (req, res) => {
  const { tableName } = req.params;
  const { limit, offset } = req.query;
  try {
    const data = await getTableData(tableName, { limit, offset });
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// production static build & asset serving

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use(express.static(path.join(__dirname, 'public')));

// catch-all handler for SPA in production mode
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexHtml = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  next();
});

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MinePay server running at port ${PORT}`);
  });
}

export default app;
