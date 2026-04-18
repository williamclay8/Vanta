import { Buffer } from "buffer";

if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

if (typeof globalThis.process === "undefined") {
  (globalThis as unknown as { process: unknown }).process = {
    env: {},
  };
}
