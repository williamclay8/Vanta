const DEFAULT_SYMBOLS = ["SOLUSDT", "BTCUSDT", "ETHUSDT"];
const BINANCE_US_BASE_URL = "https://api.binance.us/api/v3";

export const tradingDataProvider = {
  id: "binance-us-public",
  label: "Binance.US public market data API",
  sourceUrls: [
    `${BINANCE_US_BASE_URL}/ticker/24hr`,
    `${BINANCE_US_BASE_URL}/klines`,
  ],
};

export function createTradingDataFreshness(generatedAt = new Date().toISOString()) {
  return {
    generatedAt,
    providerId: tradingDataProvider.id,
    providerLabel: tradingDataProvider.label,
    sourceUrls: tradingDataProvider.sourceUrls,
  };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "vanta-trading-lab-local-product-lane",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

function summarizeKlines(klines) {
  const closes = klines.map((kline) => toNumber(kline[4])).filter((value) => value !== null);
  const highs = klines.map((kline) => toNumber(kline[2])).filter((value) => value !== null);
  const lows = klines.map((kline) => toNumber(kline[3])).filter((value) => value !== null);
  const volumes = klines.map((kline) => toNumber(kline[5])).filter((value) => value !== null);
  const firstClose = closes[0] ?? null;
  const lastClose = closes.at(-1) ?? null;

  return {
    bars: closes.length,
    changePct: firstClose && lastClose ? ((lastClose - firstClose) / firstClose) * 100 : null,
    high: highs.length ? Math.max(...highs) : null,
    lastClose,
    low: lows.length ? Math.min(...lows) : null,
    volume: volumes.reduce((sum, value) => sum + value, 0),
  };
}

export function normalizeMarketObservation({ klines, ticker }) {
  const price = toNumber(ticker.lastPrice);
  const dayChangePct = toNumber(ticker.priceChangePercent);
  const dayHigh = toNumber(ticker.highPrice);
  const dayLow = toNumber(ticker.lowPrice);
  const quoteVolume = toNumber(ticker.quoteVolume);
  const history = summarizeKlines(klines);
  const rangePosition =
    price !== null && dayHigh !== null && dayLow !== null && dayHigh > dayLow
      ? ((price - dayLow) / (dayHigh - dayLow)) * 100
      : null;

  return {
    dayChangePct,
    dayHigh,
    dayLow,
    history,
    price,
    providerId: tradingDataProvider.id,
    quoteVolume,
    rangePosition,
    receivedAt: new Date().toISOString(),
    symbol: ticker.symbol,
  };
}

export function describeMarketObservation(row) {
  const rangeLabel =
    row.rangePosition === null
      ? "Unknown range position"
      : row.rangePosition > 72
        ? "Near upper 24h range"
        : row.rangePosition < 28
          ? "Near lower 24h range"
          : "Middle of 24h range";
  const momentumLabel =
    row.dayChangePct === null
      ? "Unknown 24h momentum"
      : row.dayChangePct > 3
        ? "Strong positive 24h move"
        : row.dayChangePct < -3
          ? "Strong negative 24h move"
          : "Muted 24h move";

  return {
    ...row,
    momentumLabel,
    rangeLabel,
  };
}

export async function fetchTradingLabMarketData(input = {}) {
  const symbols = input.symbols ?? DEFAULT_SYMBOLS;
  const rows = await Promise.all(
    symbols.map(async (symbol) => {
      const [ticker, klines] = await Promise.all([
        fetchJson(`${BINANCE_US_BASE_URL}/ticker/24hr?symbol=${symbol}`),
        fetchJson(`${BINANCE_US_BASE_URL}/klines?symbol=${symbol}&interval=1h&limit=48`),
      ]);

      return describeMarketObservation(normalizeMarketObservation({ klines, ticker }));
    }),
  );

  return {
    freshness: createTradingDataFreshness(),
    rows,
  };
}
