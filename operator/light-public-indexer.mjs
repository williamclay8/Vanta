import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Simple structured logger
function log(level, message, meta = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  }));
}

// Request logger + timing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    log('info', 'Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip
    });
  });
  next();
});

// Rate limiting (simple in-memory)
const requestLog = new Map();
const RATE_LIMIT = 120;
const WINDOW_MS = 60 * 1000;

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  if (!requestLog.has(ip)) requestLog.set(ip, []);
  const requests = requestLog.get(ip).filter(t => t > windowStart);
  requests.push(now);
  requestLog.set(ip, requests);

  if (requests.length > RATE_LIMIT) {
    log('warn', 'Rate limit exceeded', { ip });
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}

app.use(rateLimit);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get current roots
app.get('/root', async (req, res) => {
  try {
    // In production, this would come from a real data source
    const rootData = {
      merkleRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
      nullifierRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
      timestamp: Date.now()
    };
    res.json(rootData);
  } catch (error) {
    log('error', 'Failed to fetch roots', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch roots' });
  }
});

// Get recent nullifiers
app.get('/nullifiers', async (req, res) => {
  try {
    const since = req.query.since || '0';
    res.json({ nullifiers: [], since });
  } catch (error) {
    log('error', 'Failed to fetch nullifiers', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch nullifiers' });
  }
});

// Metrics
app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: Date.now()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  log('error', 'Unhandled error', { error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  log('info', `Light Public Indexer running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  log('info', 'Shutting down gracefully');
  server.close(() => process.exit(0));
});