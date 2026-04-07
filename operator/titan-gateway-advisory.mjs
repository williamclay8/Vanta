import { PublicKey } from "@solana/web3.js";

const DEFAULT_TIMEOUT_MS = 4_000;
const DEFAULT_SLIPPAGE_BPS = 100;
const DEFAULT_UPDATE_INTERVAL_MS = 250;
const DEFAULT_MAX_ADVISORY_SPREAD_BPS = 200;
const DEFAULT_INPUT_DECIMALS = 6;
const DEFAULT_OUTPUT_DECIMALS = 9;

function getOptionalEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function getNumberEnv(name, fallback) {
  const raw = getOptionalEnv(name);

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }

  return parsed;
}

function encodeUint8(value) {
  return value instanceof Uint8Array ? value : new Uint8Array(value);
}

function concatBytes(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function encodeNumber(value) {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    const bytes = new Uint8Array(9);
    bytes[0] = 0xcb;
    new DataView(bytes.buffer).setFloat64(1, value);
    return bytes;
  }

  return encodeInteger(BigInt(value));
}

function encodeInteger(value) {
  if (value >= 0n) {
    if (value <= 0x7fn) {
      return Uint8Array.of(Number(value));
    }

    if (value <= 0xffn) {
      return Uint8Array.of(0xcc, Number(value));
    }

    if (value <= 0xffffn) {
      const bytes = new Uint8Array(3);
      bytes[0] = 0xcd;
      new DataView(bytes.buffer).setUint16(1, Number(value));
      return bytes;
    }

    if (value <= 0xffffffffn) {
      const bytes = new Uint8Array(5);
      bytes[0] = 0xce;
      new DataView(bytes.buffer).setUint32(1, Number(value));
      return bytes;
    }

    const bytes = new Uint8Array(9);
    bytes[0] = 0xcf;
    new DataView(bytes.buffer).setBigUint64(1, value);
    return bytes;
  }

  if (value >= -32n) {
    return Uint8Array.of(Number(0x100n + value));
  }

  if (value >= -128n) {
    const bytes = new Uint8Array(2);
    bytes[0] = 0xd0;
    new DataView(bytes.buffer).setInt8(1, Number(value));
    return bytes;
  }

  if (value >= -32768n) {
    const bytes = new Uint8Array(3);
    bytes[0] = 0xd1;
    new DataView(bytes.buffer).setInt16(1, Number(value));
    return bytes;
  }

  if (value >= -2147483648n) {
    const bytes = new Uint8Array(5);
    bytes[0] = 0xd2;
    new DataView(bytes.buffer).setInt32(1, Number(value));
    return bytes;
  }

  const bytes = new Uint8Array(9);
  bytes[0] = 0xd3;
  new DataView(bytes.buffer).setBigInt64(1, value);
  return bytes;
}

function encodeString(value) {
  const bytes = new TextEncoder().encode(value);
  const length = bytes.length;

  if (length <= 31) {
    return concatBytes([Uint8Array.of(0xa0 | length), bytes]);
  }

  if (length <= 0xff) {
    return concatBytes([Uint8Array.of(0xd9, length), bytes]);
  }

  if (length <= 0xffff) {
    const header = new Uint8Array(3);
    header[0] = 0xda;
    new DataView(header.buffer).setUint16(1, length);
    return concatBytes([header, bytes]);
  }

  const header = new Uint8Array(5);
  header[0] = 0xdb;
  new DataView(header.buffer).setUint32(1, length);
  return concatBytes([header, bytes]);
}

function encodeBinary(value) {
  const bytes = encodeUint8(value);
  const length = bytes.length;

  if (length <= 0xff) {
    return concatBytes([Uint8Array.of(0xc4, length), bytes]);
  }

  if (length <= 0xffff) {
    const header = new Uint8Array(3);
    header[0] = 0xc5;
    new DataView(header.buffer).setUint16(1, length);
    return concatBytes([header, bytes]);
  }

  const header = new Uint8Array(5);
  header[0] = 0xc6;
  new DataView(header.buffer).setUint32(1, length);
  return concatBytes([header, bytes]);
}

function encodeArray(values) {
  const encodedValues = values.map((value) => encodeMessagePack(value));
  const length = encodedValues.length;

  if (length <= 15) {
    return concatBytes([Uint8Array.of(0x90 | length), ...encodedValues]);
  }

  if (length <= 0xffff) {
    const header = new Uint8Array(3);
    header[0] = 0xdc;
    new DataView(header.buffer).setUint16(1, length);
    return concatBytes([header, ...encodedValues]);
  }

  const header = new Uint8Array(5);
  header[0] = 0xdd;
  new DataView(header.buffer).setUint32(1, length);
  return concatBytes([header, ...encodedValues]);
}

function encodeMap(value) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  const header =
    entries.length <= 15
      ? Uint8Array.of(0x80 | entries.length)
      : (() => {
          const bytes = new Uint8Array(3);
          bytes[0] = 0xde;
          new DataView(bytes.buffer).setUint16(1, entries.length);
          return bytes;
        })();

  const encodedEntries = [];

  for (const [key, entryValue] of entries) {
    encodedEntries.push(encodeString(key), encodeMessagePack(entryValue));
  }

  return concatBytes([header, ...encodedEntries]);
}

function encodeMessagePack(value) {
  if (value === null) {
    return Uint8Array.of(0xc0);
  }

  if (typeof value === "boolean") {
    return Uint8Array.of(value ? 0xc3 : 0xc2);
  }

  if (typeof value === "number") {
    return encodeNumber(value);
  }

  if (typeof value === "bigint") {
    return encodeInteger(value);
  }

  if (typeof value === "string") {
    return encodeString(value);
  }

  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return encodeBinary(value);
  }

  if (Array.isArray(value)) {
    return encodeArray(value);
  }

  if (typeof value === "object") {
    return encodeMap(value);
  }

  throw new Error("Unsupported MessagePack value.");
}

function decodeMessagePack(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  function read(length) {
    const start = offset;
    offset += length;
    return new Uint8Array(bytes.buffer, bytes.byteOffset + start, length);
  }

  function readUint8() {
    const value = view.getUint8(offset);
    offset += 1;
    return value;
  }

  function readUint16() {
    const value = view.getUint16(offset);
    offset += 2;
    return value;
  }

  function readUint32() {
    const value = view.getUint32(offset);
    offset += 4;
    return value;
  }

  function readUint64() {
    const value = view.getBigUint64(offset);
    offset += 8;
    return value;
  }

  function readInt8() {
    const value = view.getInt8(offset);
    offset += 1;
    return value;
  }

  function readInt16() {
    const value = view.getInt16(offset);
    offset += 2;
    return value;
  }

  function readInt32() {
    const value = view.getInt32(offset);
    offset += 4;
    return value;
  }

  function readInt64() {
    const value = view.getBigInt64(offset);
    offset += 8;
    return value;
  }

  function decodeValue() {
    const prefix = readUint8();

    if (prefix <= 0x7f) {
      return prefix;
    }

    if (prefix >= 0xe0) {
      return prefix - 0x100;
    }

    if ((prefix & 0xe0) === 0xa0) {
      return new TextDecoder().decode(read(prefix & 0x1f));
    }

    if ((prefix & 0xf0) === 0x90) {
      const length = prefix & 0x0f;
      const values = [];
      for (let index = 0; index < length; index += 1) {
        values.push(decodeValue());
      }
      return values;
    }

    if ((prefix & 0xf0) === 0x80) {
      const length = prefix & 0x0f;
      const value = {};
      for (let index = 0; index < length; index += 1) {
        value[decodeValue()] = decodeValue();
      }
      return value;
    }

    switch (prefix) {
      case 0xc0:
        return null;
      case 0xc2:
        return false;
      case 0xc3:
        return true;
      case 0xc4:
        return read(readUint8()).slice();
      case 0xc5:
        return read(readUint16()).slice();
      case 0xc6:
        return read(readUint32()).slice();
      case 0xca: {
        const value = view.getFloat32(offset);
        offset += 4;
        return value;
      }
      case 0xcb: {
        const value = view.getFloat64(offset);
        offset += 8;
        return value;
      }
      case 0xcc:
        return readUint8();
      case 0xcd:
        return readUint16();
      case 0xce:
        return readUint32();
      case 0xcf:
        return readUint64();
      case 0xd0:
        return readInt8();
      case 0xd1:
        return readInt16();
      case 0xd2:
        return readInt32();
      case 0xd3:
        return readInt64();
      case 0xd9:
        return new TextDecoder().decode(read(readUint8()));
      case 0xda:
        return new TextDecoder().decode(read(readUint16()));
      case 0xdb:
        return new TextDecoder().decode(read(readUint32()));
      case 0xdc: {
        const length = readUint16();
        const values = [];
        for (let index = 0; index < length; index += 1) {
          values.push(decodeValue());
        }
        return values;
      }
      case 0xdd: {
        const length = readUint32();
        const values = [];
        for (let index = 0; index < length; index += 1) {
          values.push(decodeValue());
        }
        return values;
      }
      case 0xde: {
        const length = readUint16();
        const value = {};
        for (let index = 0; index < length; index += 1) {
          value[decodeValue()] = decodeValue();
        }
        return value;
      }
      case 0xdf: {
        const length = readUint32();
        const value = {};
        for (let index = 0; index < length; index += 1) {
          value[decodeValue()] = decodeValue();
        }
        return value;
      }
      default:
        throw new Error(`Unsupported Titan MessagePack prefix: 0x${prefix.toString(16)}`);
    }
  }

  return decodeValue();
}

function normalizeNumber(value) {
  if (typeof value === "bigint") {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
  }

  return typeof value === "number" ? value : null;
}

function normalizeBigInt(value) {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }

  if (typeof value === "string" && value.trim()) {
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }

  return null;
}

function bpsDifference(left, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right) || left <= 0 || right <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return (Math.abs(left - right) / right) * 10_000;
}

function decimalToRawAmount(amount, decimals) {
  const normalized = String(amount).trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Titan advisory amount must be a positive decimal string.");
  }

  const [wholePart, fractionalPart = ""] = normalized.split(".");
  const paddedFractional = `${fractionalPart}${"0".repeat(decimals)}`.slice(0, decimals);
  return BigInt(`${wholePart}${paddedFractional}`.replace(/^0+(?=\d)/, "") || "0");
}

function rawAmountToDecimal(amount, decimals) {
  const raw = normalizeBigInt(amount);

  if (raw === null) {
    return null;
  }

  const negative = raw < 0n;
  const absolute = negative ? raw * -1n : raw;
  const scale = 10n ** BigInt(decimals);
  const whole = absolute / scale;
  const fractional = absolute % scale;
  const fractionalText = fractional.toString().padStart(decimals, "0").replace(/0+$/, "");
  const value = fractionalText ? `${whole}.${fractionalText}` : `${whole}`;

  return negative ? `-${value}` : value;
}

function withAuthQuery(url, jwt) {
  const parsed = new URL(url);

  if (jwt) {
    parsed.searchParams.set("auth", jwt);
  }

  return parsed.toString();
}

function normalizeTitanRoute(providerId, route, outputDecimals) {
  const outAmountRaw = normalizeBigInt(route?.outAmount);
  const expiresAtMs = normalizeNumber(route?.expiresAtMs);

  if (outAmountRaw === null || outAmountRaw <= 0n) {
    return null;
  }

  return {
    expiresAtMs: typeof expiresAtMs === "number" ? expiresAtMs : null,
    outAmount: rawAmountToDecimal(outAmountRaw, outputDecimals),
    outAmountRaw,
    providerId,
    providerReferenceId:
      typeof route?.referenceId === "string"
        ? route.referenceId
        : typeof route?.reference_id === "string"
          ? route.reference_id
          : null,
    slippageBps:
      typeof route?.slippageBps === "number" && Number.isFinite(route.slippageBps)
        ? route.slippageBps
        : null,
  };
}

function extractTitanQuote(message, outputDecimals) {
  if (!message || typeof message !== "object") {
    return null;
  }

  if (message.Error && typeof message.Error.message === "string") {
    const error = new Error(message.Error.message);
    error.cause = { code: message.Error.code ?? null, source: "titan_gateway" };
    throw error;
  }

  if (!message.StreamData?.payload?.SwapQuotes?.quotes) {
    return null;
  }

  const swapQuotes = message.StreamData.payload.SwapQuotes;
  const quotes = Object.entries(swapQuotes.quotes)
    .map(([providerId, route]) => normalizeTitanRoute(providerId, route, outputDecimals))
    .filter(Boolean);

  if (quotes.length === 0) {
    return null;
  }

  const bestQuote = quotes.reduce((best, quote) =>
    quote.outAmountRaw > best.outAmountRaw ? quote : best,
  );

  return {
    expiresAtMs: bestQuote.expiresAtMs,
    outputAmount: bestQuote.outAmount,
    outputAmountRaw: bestQuote.outAmountRaw.toString(),
    providerCount: quotes.length,
    providerId: bestQuote.providerId,
    providerReferenceId: bestQuote.providerReferenceId,
    quoteId: typeof swapQuotes.id === "string" ? swapQuotes.id : null,
    quoteTimestamp: Date.now(),
    slippageBps: bestQuote.slippageBps,
    streamId:
      typeof message.StreamData.id === "number" && Number.isFinite(message.StreamData.id)
        ? message.StreamData.id
        : null,
  };
}

function buildTitanRequest(args) {
  return {
    data: {
      NewSwapQuoteStream: {
        swap: {
          amount: decimalToRawAmount(args.inputAmount, args.inputDecimals),
          inputMint: new PublicKey(args.inputMint).toBytes(),
          outputMint: new PublicKey(args.outputMint).toBytes(),
          slippageBps: args.slippageBps,
          swapMode: "ExactIn",
        },
        transaction: {
          userPublicKey: new PublicKey(args.userPublicKey).toBytes(),
        },
        update: {
          intervalMs: args.updateIntervalMs,
          numQuotes: 1,
        },
      },
    },
    id: 1,
  };
}

export function readTitanGatewayConfig() {
  return {
    enabled: Boolean(
      getOptionalEnv("VANTA_TITAN_GATEWAY_URL") && getOptionalEnv("VANTA_TITAN_GATEWAY_JWT"),
    ),
    inputDecimals: getNumberEnv(
      "VANTA_TITAN_GATEWAY_INPUT_DECIMALS",
      DEFAULT_INPUT_DECIMALS,
    ),
    jwt: getOptionalEnv("VANTA_TITAN_GATEWAY_JWT"),
    maxAdvisorySpreadBps: getNumberEnv(
      "VANTA_TITAN_GATEWAY_MAX_ADVISORY_SPREAD_BPS",
      DEFAULT_MAX_ADVISORY_SPREAD_BPS,
    ),
    outputDecimals: getNumberEnv(
      "VANTA_TITAN_GATEWAY_OUTPUT_DECIMALS",
      DEFAULT_OUTPUT_DECIMALS,
    ),
    slippageBps: getNumberEnv("VANTA_TITAN_GATEWAY_SLIPPAGE_BPS", DEFAULT_SLIPPAGE_BPS),
    timeoutMs: getNumberEnv("VANTA_TITAN_GATEWAY_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
    updateIntervalMs: getNumberEnv(
      "VANTA_TITAN_GATEWAY_UPDATE_INTERVAL_MS",
      DEFAULT_UPDATE_INTERVAL_MS,
    ),
    url: getOptionalEnv("VANTA_TITAN_GATEWAY_URL"),
    userPublicKey: getOptionalEnv("VANTA_TITAN_GATEWAY_USER_PUBLIC_KEY"),
  };
}

export function validateTitanGatewayConfig() {
  const config = readTitanGatewayConfig();
  const issues = [];

  if (config.url && !config.jwt) {
    issues.push("VANTA_TITAN_GATEWAY_JWT is missing.");
  }

  if (config.jwt && !config.url) {
    issues.push("VANTA_TITAN_GATEWAY_URL is missing.");
  }

  if (config.inputDecimals % 1 !== 0 || config.outputDecimals % 1 !== 0) {
    issues.push("Titan advisory decimals must be whole numbers.");
  }

  return {
    config,
    enabled: issues.length === 0 && Boolean(config.url && config.jwt),
    issues,
    valid: issues.length === 0,
  };
}

export async function probeTitanGatewayQuote(args) {
  const validation = validateTitanGatewayConfig();

  if (!validation.valid) {
    return {
      message: "Titan advisory probe skipped because local Titan config is incomplete.",
      reason: "config_error",
      source: "Titan Gateway",
      status: "unavailable",
    };
  }

  if (!validation.enabled || !validation.config.url || !validation.config.jwt) {
    return {
      message: "Titan advisory probe is not configured for this operator.",
      reason: "not_configured",
      source: "Titan Gateway",
      status: "unavailable",
    };
  }

  if (typeof WebSocket !== "function") {
    return {
      message: "Titan advisory probe skipped because WebSocket support is unavailable.",
      reason: "websocket_unavailable",
      source: "Titan Gateway",
      status: "unavailable",
    };
  }

  const userPublicKey = validation.config.userPublicKey ?? args.userPublicKey;

  try {
    const probe = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Titan advisory quote timed out."));
      }, validation.config.timeoutMs);
      const protocol = "v1.api.titan.ag";
      const socket = new WebSocket(withAuthQuery(validation.config.url, validation.config.jwt), [
        protocol,
      ]);
      let settled = false;
      let streamId = null;

      function cleanup() {
        clearTimeout(timeout);
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
      }

      function settle(callback) {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        callback();
        try {
          socket.close();
        } catch {
          // Best-effort close.
        }
      }

      socket.binaryType = "arraybuffer";

      socket.onopen = () => {
        try {
          const requestPayload = buildTitanRequest({
            ...args,
            inputDecimals: validation.config.inputDecimals,
            slippageBps: validation.config.slippageBps,
            updateIntervalMs: validation.config.updateIntervalMs,
            userPublicKey,
          });
          socket.send(encodeMessagePack(requestPayload));
        } catch (error) {
          settle(() => reject(error));
        }
      };

      socket.onmessage = (event) => {
        try {
          const payloadBytes =
            event.data instanceof ArrayBuffer
              ? new Uint8Array(event.data)
              : event.data instanceof Uint8Array
                ? event.data
                : new Uint8Array(event.data);
          const message = decodeMessagePack(payloadBytes);

          if (message?.Response?.stream?.id !== undefined) {
            streamId = Number(message.Response.stream.id);
          }

          const quote = extractTitanQuote(message, validation.config.outputDecimals);

          if (!quote) {
            return;
          }

          if (streamId !== null && Number.isFinite(streamId)) {
            try {
              socket.send(
                encodeMessagePack({
                  data: {
                    StopStream: { id: streamId },
                  },
                  id: 2,
                }),
              );
            } catch {
              // Best-effort stream stop before close.
            }
          }

          settle(() =>
            resolve({
              ...quote,
              message: "Titan advisory quote stream returned a usable comparison quote.",
              reason: null,
              source: "Titan Gateway",
              status: "available",
            }),
          );
        } catch (error) {
          settle(() => reject(error));
        }
      };

      socket.onerror = () => {
        settle(() => reject(new Error("Titan advisory WebSocket request failed.")));
      };

      socket.onclose = (event) => {
        if (!settled) {
          settle(() =>
            reject(new Error(event.reason || "Titan advisory WebSocket closed before a quote arrived.")),
          );
        }
      };
    });

    return probe;
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Titan advisory quote probe failed unexpectedly.",
      reason: "quote_failed",
      source: "Titan Gateway",
      status: "unavailable",
    };
  }
}

export function compareTitanAdvisoryQuote(args) {
  const config = readTitanGatewayConfig();

  if (args.titan.status !== "available") {
    return {
      comparisonStatus: "unavailable",
      maxAcceptableSpreadBps: config.maxAdvisorySpreadBps,
      message: args.titan.message,
      meteoraOutputAmount: args.meteoraOutputAmount,
      source: "Titan Gateway",
      titanOutputAmount: null,
      titanProviderId: null,
      titanQuoteId: null,
      titanReason: args.titan.reason ?? null,
      withinAcceptableBound: false,
    };
  }

  const spreadBps = bpsDifference(Number(args.titan.outputAmount), Number(args.meteoraOutputAmount));
  const withinAcceptableBound = spreadBps <= config.maxAdvisorySpreadBps;

  return {
    comparisonStatus: withinAcceptableBound ? "aligned" : "meaningfully_different",
    maxAcceptableSpreadBps: config.maxAdvisorySpreadBps,
    message: withinAcceptableBound
      ? "Titan advisory quote is broadly aligned with the Meteora-anchored lane."
      : "Titan advisory quote differs meaningfully from the Meteora-anchored lane.",
    meteoraOutputAmount: args.meteoraOutputAmount,
    source: "Titan Gateway",
    spreadBps: Number.isFinite(spreadBps) ? Number(spreadBps.toFixed(2)) : null,
    titanExpiresAt: args.titan.expiresAtMs ?? null,
    titanOutputAmount: args.titan.outputAmount,
    titanProviderCount: args.titan.providerCount ?? null,
    titanProviderId: args.titan.providerId ?? null,
    titanProviderReferenceId: args.titan.providerReferenceId ?? null,
    titanQuoteId: args.titan.quoteId ?? null,
    titanQuoteTimestamp: args.titan.quoteTimestamp ?? null,
    titanReason: null,
    withinAcceptableBound,
  };
}

export function logTitanAdvisoryComparison(comparison, source) {
  console.info(
    "[vanta.swap.titan.advisory]",
    JSON.stringify({
      comparisonStatus: comparison.comparisonStatus,
      maxAcceptableSpreadBps: comparison.maxAcceptableSpreadBps,
      meteoraOutputAmount: comparison.meteoraOutputAmount,
      source,
      spreadBps: comparison.spreadBps ?? null,
      titanOutputAmount: comparison.titanOutputAmount,
      titanProviderCount: comparison.titanProviderCount ?? null,
      titanProviderId: comparison.titanProviderId,
      titanQuoteId: comparison.titanQuoteId,
      titanReason: comparison.titanReason,
      withinAcceptableBound: comparison.withinAcceptableBound,
    }),
  );
}
